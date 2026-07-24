-- Issue #17 (follow-up del audit de Slice C): update_sale_atomic no validaba
-- unit_price/unit_cost por línea, a diferencia de create_sale_atomic. Un editor
-- podía escribir precios/costos arbitrarios y corromper el reporting histórico
-- (useSalesStats lee los snapshots sale_products.unit_cost).
--
-- Política de producto (decidida 2026-07-24): "preservar históricos + validar nuevas".
-- Cada línea entrante se acepta si su par (unit_price, unit_cost):
--   (a) coincide con el catálogo actual (misma autorización que create_sale_atomic:
--       precio base / rappi / recompensa de lealtad, y manufacturing_cost), O
--   (b) coincide con un snapshot que YA EXISTÍA en esta venta antes del edit.
-- Cualquier otro valor se rechaza. Esto congela la economía histórica de la venta
-- y solo somete al catálogo actual lo que se agrega.

CREATE OR REPLACE FUNCTION public.update_sale_atomic(p_sale_id bigint, p_payload jsonb, p_user_id uuid DEFAULT auth.uid())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  RAPPI_COMMISSION_RATE  CONSTANT numeric := 0.2;
  POS_COMMISSION_RATE    CONSTANT numeric := 0.0344;
  RAPPI_PRICE_MULTIPLIER CONSTANT numeric := 1.3;
  PRICE_TOLERANCE        CONSTANT numeric := 0.01;
  v_user_id         uuid;
  v_sale_date       timestamptz;
  v_order_type      text;
  v_total_price     numeric;
  v_discount_amount numeric;
  v_customer_dni    text;
  v_customer_id     bigint;
  v_discounted_sub  numeric;
  v_commission      numeric;
  v_is_rappi        boolean;
  v_is_pos          boolean;
  v_user_name       text;
  v_kept            bigint[];
  v_removed         bigint;
  -- Validación de precios (política preservar-histórico + validar-nuevas)
  v_old_lines        jsonb;
  v_line             jsonb;
  v_product_id       bigint;
  v_unit_price       numeric;
  v_unit_cost        numeric;
  v_loyalty_reward   text;
  v_prod_price       numeric;
  v_prod_rappi_price numeric;
  v_prod_mfg_cost    numeric;
  v_catalog_price    numeric;
  v_authorized_price numeric;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT sale_date INTO v_sale_date FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  -- Replicate live auth_update_sales RLS (SECURITY DEFINER bypasses RLS).
  IF NOT (
    public.has_permission('sales.edit_any_date', v_user_id)
    OR (v_sale_date AT TIME ZONE 'America/Lima')::date = (now() AT TIME ZONE 'America/Lima')::date
  ) THEN
    RAISE EXCEPTION 'Solo puedes editar ventas del día actual';
  END IF;

  SELECT full_name INTO v_user_name FROM public.user_profiles WHERE id = v_user_id;

  v_order_type      := p_payload->'header'->>'order_type';
  v_total_price     := (p_payload->'header'->>'total_price')::numeric;
  v_discount_amount := COALESCE((p_payload->'header'->>'discount_amount')::numeric, 0);
  v_customer_dni    := p_payload->'header'->>'customer_dni';
  v_is_rappi := v_order_type = 'Rappi' OR (p_payload->'payment'->>'payment_method') = 'Rappi';
  v_is_pos   := (p_payload->'payment'->>'payment_method') = 'POS';

  -- Capturar snapshots de líneas EXISTENTES antes de cualquier borrado (rama histórica).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'product_id', sp.product_id,
           'unit_price', sp.unit_price,
           'unit_cost',  COALESCE(sp.unit_cost, 0)
         )), '[]'::jsonb)
  INTO v_old_lines
  FROM public.sale_products sp
  WHERE sp.sale_id = p_sale_id;

  -- Validar cada línea pendiente entrante (fail-fast, antes de mutar).
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'products')
  LOOP
    IF COALESCE(v_line->>'status', 'Pendiente') = 'Entregado' THEN
      CONTINUE;
    END IF;

    v_product_id     := (v_line->>'product_id')::bigint;
    v_unit_price     := (v_line->>'unit_price')::numeric;
    v_unit_cost      := COALESCE((v_line->>'unit_cost')::numeric, 0);
    v_loyalty_reward := v_line->>'loyalty_reward';

    SELECT price, COALESCE(rappi_price, 0), COALESCE(manufacturing_cost, 0)
    INTO   v_prod_price, v_prod_rappi_price, v_prod_mfg_cost
    FROM   public.products WHERE id = v_product_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no encontrado', v_product_id;
    END IF;

    IF v_is_rappi THEN
      v_catalog_price := COALESCE(NULLIF(v_prod_rappi_price, 0), ROUND(v_prod_price * RAPPI_PRICE_MULTIPLIER, 2));
    ELSE
      v_catalog_price := v_prod_price;
    END IF;

    IF v_loyalty_reward = '50_postre' THEN
      v_authorized_price := v_catalog_price / 2;
    ELSIF v_loyalty_reward = 'bebida_gratis' THEN
      v_authorized_price := 0;
    ELSE
      v_authorized_price := v_catalog_price;
    END IF;

    -- (a) coincide con el catálogo actual (par completo), O
    -- (b) el par (precio, costo) existía en esta venta antes del edit (histórico).
    IF NOT (
      ABS(v_unit_price - v_authorized_price) <= PRICE_TOLERANCE
      AND ABS(v_unit_cost - v_prod_mfg_cost) <= PRICE_TOLERANCE
    ) AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_old_lines) o
      WHERE (o->>'product_id')::bigint = v_product_id
        AND ABS((o->>'unit_price')::numeric - v_unit_price) <= PRICE_TOLERANCE
        AND ABS(COALESCE((o->>'unit_cost')::numeric, 0) - v_unit_cost) <= PRICE_TOLERANCE
    ) THEN
      RAISE EXCEPTION 'Precio/costo de línea inválido (producto %, precio %, costo %): no coincide con el catálogo actual ni con un snapshot histórico de esta venta',
        v_product_id, v_unit_price, v_unit_cost;
    END IF;
  END LOOP;

  IF v_customer_dni IS NOT NULL AND v_customer_dni <> '' THEN
    BEGIN
      INSERT INTO public.customers (dni) VALUES (v_customer_dni::bigint)
      ON CONFLICT (dni) DO NOTHING RETURNING id INTO v_customer_id;
      IF v_customer_id IS NULL THEN
        SELECT id INTO v_customer_id FROM public.customers WHERE dni = v_customer_dni::bigint;
      END IF;
    EXCEPTION WHEN OTHERS THEN v_customer_id := NULL;
    END;
  END IF;

  v_discounted_sub := GREATEST(0, v_total_price - v_discount_amount);
  IF v_is_rappi THEN v_commission := ROUND(v_discounted_sub * RAPPI_COMMISSION_RATE, 2);
  ELSIF v_is_pos THEN v_commission := ROUND(v_discounted_sub * POS_COMMISSION_RATE, 2);
  ELSE v_commission := NULL; END IF;

  -- 1. Header update
  UPDATE public.sales SET
    order_type      = v_order_type,
    total_price     = v_total_price,
    discount_amount = v_discount_amount,
    commission      = v_commission,
    customer_id     = v_customer_id,
    table_number    = CASE WHEN v_order_type = 'Mesa' THEN (p_payload->'header'->>'table_number')::int ELSE NULL END,
    notes           = NULLIF(p_payload->'header'->>'notes', ''),
    last_edited_by  = v_user_id,
    last_edited_at  = now(),
    payment_method  = NULLIF(p_payload->'payment'->>'payment_method', ''),
    payment_date    = CASE
                        WHEN (p_payload->'payment'->>'payment_method') IS NOT NULL
                         AND (p_payload->'payment'->>'payment_method') <> ''
                        THEN COALESCE(NULLIF(p_payload->'payment'->>'payment_date', ''), now()::text)::timestamptz
                        ELSE NULL
                      END,
    cash_amount     = (p_payload->'payment'->>'cash_amount')::numeric,
    plin_amount     = (p_payload->'payment'->>'plin_amount')::numeric,
    cash_received   = (p_payload->'payment'->>'cash_received')::numeric
  WHERE id = p_sale_id;

  -- 2. Remove delivered items dropped by the editor (admin-only sub-op; reverses 'entrega' inventory)
  SELECT COALESCE(array_agg(e::bigint), ARRAY[]::bigint[]) INTO v_kept
  FROM jsonb_array_elements_text(COALESCE(p_payload->'kept_delivered_ids', '[]'::jsonb)) e;

  FOR v_removed IN
    SELECT sp.id FROM public.sale_products sp
    WHERE sp.sale_id = p_sale_id AND sp.status = 'Entregado' AND NOT (sp.id = ANY (v_kept))
  LOOP
    PERFORM public.delete_delivered_sale_product(v_removed, v_user_id, v_user_name);
  END LOOP;

  -- 3. Delete pending items
  DELETE FROM public.sale_products WHERE sale_id = p_sale_id AND status = 'Pendiente';

  -- 4. Insert new pending items (mirror create_sale_atomic)
  INSERT INTO public.sale_products (
    sale_id, product_id, quantity, unit_price, unit_cost,
    temperatura, tipo_leche, loyalty_reward, discount_amount, status
  )
  SELECT
    p_sale_id,
    (line->>'product_id')::bigint,
    (line->>'quantity')::int,
    (line->>'unit_price')::numeric,
    COALESCE((line->>'unit_cost')::numeric, 0),
    NULLIF(line->>'temperatura', ''),
    NULLIF(line->>'tipo_leche', ''),
    NULLIF(line->>'loyalty_reward', ''),
    GREATEST(0, LEAST(
      COALESCE((line->>'discount_amount')::numeric, 0),
      (line->>'quantity')::int * (line->>'unit_price')::numeric
    )),
    'Pendiente'
  FROM jsonb_array_elements(p_payload->'products') AS line
  WHERE COALESCE(line->>'status', 'Pendiente') <> 'Entregado';

  -- 5. Replace transactions (always; empty payment_entries = revert-only)
  PERFORM public.replace_sale_transactions(p_sale_id, COALESCE(p_payload->'payment_entries', '[]'::jsonb), v_user_id);
END;
$function$;

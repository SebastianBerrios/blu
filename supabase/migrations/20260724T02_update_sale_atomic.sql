-- atomic-integrity Slice C: make updateSale atomic via a single SECURITY DEFINER RPC.
-- Replicates the live auth_update_sales RLS gate: has_permission('sales.edit_any_date')
-- OR the sale is from today (America/Lima) — NOT owner+día. Mirrors create_sale_atomic's
-- customer upsert / commission / product insert; PERFORMs the proven delete_delivered_sale_product
-- (admin-only sub-op, reverses 'entrega' inventory) and replace_sale_transactions (empty
-- payment_entries = revert-only). Deliberately does NOT validate unit_price/unit_cost per line:
-- updateSale never did, and unit_cost is a historical snapshot (validating would falsely reject
-- edits of cost-drifted sales).
CREATE OR REPLACE FUNCTION public.update_sale_atomic(
  p_sale_id bigint,
  p_payload jsonb,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  RAPPI_COMMISSION_RATE CONSTANT numeric := 0.2;
  POS_COMMISSION_RATE   CONSTANT numeric := 0.0344;
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
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT sale_date INTO v_sale_date FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

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

  SELECT COALESCE(array_agg(e::bigint), ARRAY[]::bigint[]) INTO v_kept
  FROM jsonb_array_elements_text(COALESCE(p_payload->'kept_delivered_ids', '[]'::jsonb)) e;

  FOR v_removed IN
    SELECT sp.id FROM public.sale_products sp
    WHERE sp.sale_id = p_sale_id AND sp.status = 'Entregado' AND NOT (sp.id = ANY (v_kept))
  LOOP
    PERFORM public.delete_delivered_sale_product(v_removed, v_user_id, v_user_name);
  END LOOP;

  DELETE FROM public.sale_products WHERE sale_id = p_sale_id AND status = 'Pendiente';

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

  PERFORM public.replace_sale_transactions(p_sale_id, COALESCE(p_payload->'payment_entries', '[]'::jsonb), v_user_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_sale_atomic(bigint, jsonb, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_sale_atomic(bigint, jsonb, uuid) TO authenticated;

-- =============================================================================
-- Migration: 20260706T01_create_sale_atomic
-- Purpose  : Atomic RPC for sale creation. Replaces 3 round-trips
--            (INSERT sales → INSERT sale_products → replace_sale_transactions)
--            with a single transaction so a mid-flight failure can never
--            orphan a sale from its transactions or leave partial product rows.
--
-- Rollback : DROP FUNCTION IF EXISTS public.create_sale_atomic(jsonb);
--            The client service reverts to the pre-change salesService.createSale
--            via `git revert` of the T1.4 service commit. No data written by
--            this function needs undoing beyond normal sale deletion.
--
-- Sync pairs (SQL ↔ TypeScript — must be kept in lockstep):
--   • computeCommission()  in salesService.ts ↔ commission block below
--   • resolveProductPrice() in ProductSelector.tsx:23-27 ↔ catalog_price CASE
--   • rewardedPrice()      in loyaltyUtils.ts ↔ authorized_unit_price CASE
--   • buildSalePayments()  in salesService.ts ↔ payment INSERT block below
--     (replace_sale_transactions is called here instead of duplicating its
--      full validation logic — it is already SECURITY DEFINER and tx-safe)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_sale_atomic(p_payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Rate constants (sync with src/features/ventas/constants.ts)
  RAPPI_COMMISSION_RATE   CONSTANT numeric := 0.2;
  POS_COMMISSION_RATE     CONSTANT numeric := 0.0344;
  -- Rappi price multiplier (sync with RAPPI_SUGGESTED_PRICE_MULTIPLIER = 1.3)
  RAPPI_PRICE_MULTIPLIER  CONSTANT numeric := 1.3;
  PRICE_TOLERANCE         CONSTANT numeric := 0.01;

  -- Header fields
  v_order_type       text;
  v_table_number     int;
  v_notes            text;
  v_customer_dni     text;
  v_user_id          uuid;
  v_total_price      numeric;
  v_discount_amount  numeric;
  v_register_payment boolean;

  -- Derived
  v_customer_id      bigint;
  v_discounted_sub   numeric;
  v_commission       numeric;
  v_is_rappi         boolean;
  v_is_pos           boolean;
  v_sale_id          bigint;

  -- Product line iteration
  v_line             jsonb;
  v_product_id       bigint;
  v_quantity         int;
  v_unit_price       numeric;
  v_unit_cost        numeric;
  v_line_discount    numeric;
  v_loyalty_reward   text;
  v_catalog_price    numeric;
  v_authorized_price numeric;
  v_prod_price       numeric;
  v_prod_rappi_price numeric;
  v_prod_mfg_cost    numeric;

  -- Payment building (passed to replace_sale_transactions)
  v_payments         jsonb;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Parse header
  -- -------------------------------------------------------------------------
  v_order_type       := p_payload->'header'->>'order_type';
  v_table_number     := (p_payload->'header'->>'table_number')::int;
  v_notes            := p_payload->'header'->>'notes';
  v_customer_dni     := p_payload->'header'->>'customer_dni';
  -- Prefer the session user; the payload value is only a fallback for
  -- service-role contexts where auth.uid() is NULL (see MCP memory note).
  -- This prevents an authenticated user from impersonating another user_id.
  v_user_id          := COALESCE(auth.uid(), (p_payload->'header'->>'user_id')::uuid);
  v_total_price      := (p_payload->'header'->>'total_price')::numeric;
  v_discount_amount  := COALESCE((p_payload->'header'->>'discount_amount')::numeric, 0);
  v_register_payment := COALESCE((p_payload->'header'->>'register_payment')::boolean, false);

  v_is_rappi := v_order_type = 'Rappi' OR (p_payload->'payment'->>'payment_method') = 'Rappi';
  v_is_pos   := (p_payload->'payment'->>'payment_method') = 'POS';

  -- -------------------------------------------------------------------------
  -- 2. Resolve customer by DNI (upsert — matches resolveCustomerId() in TS)
  -- -------------------------------------------------------------------------
  IF v_customer_dni IS NOT NULL AND v_customer_dni <> '' THEN
    BEGIN
      INSERT INTO public.customers (dni)
      VALUES (v_customer_dni::bigint)
      ON CONFLICT (dni) DO NOTHING
      RETURNING id INTO v_customer_id;

      IF v_customer_id IS NULL THEN
        SELECT id INTO v_customer_id
        FROM public.customers
        WHERE dni = v_customer_dni::bigint;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Non-numeric DNI — skip customer association
      v_customer_id := NULL;
    END;
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Server-side commission recompute (do NOT trust client value)
  --    Mirrors computeCommission() — sync pair documented above.
  -- -------------------------------------------------------------------------
  v_discounted_sub := GREATEST(0, v_total_price - v_discount_amount);

  IF v_is_rappi THEN
    v_commission := ROUND(v_discounted_sub * RAPPI_COMMISSION_RATE, 2);
  ELSIF v_is_pos THEN
    v_commission := ROUND(v_discounted_sub * POS_COMMISSION_RATE, 2);
  ELSE
    v_commission := NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Price validation per line
  --    Mirrors resolveProductPrice() + rewardedPrice() — sync pairs above.
  -- -------------------------------------------------------------------------
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'products')
  LOOP
    v_product_id    := (v_line->>'product_id')::bigint;
    v_quantity      := (v_line->>'quantity')::int;
    v_unit_price    := (v_line->>'unit_price')::numeric;
    v_unit_cost     := COALESCE((v_line->>'unit_cost')::numeric, 0);
    v_line_discount := COALESCE((v_line->>'discount_amount')::numeric, 0);
    v_loyalty_reward := v_line->>'loyalty_reward';

    -- Clamp line discount to [0, quantity * unit_price]
    v_line_discount := GREATEST(0, LEAST(v_line_discount, v_quantity * v_unit_price));

    -- Fetch catalog price
    SELECT price, COALESCE(rappi_price, 0), COALESCE(manufacturing_cost, 0)
    INTO   v_prod_price, v_prod_rappi_price, v_prod_mfg_cost
    FROM   public.products
    WHERE  id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no encontrado', v_product_id;
    END IF;

    -- catalog_price: mirrors resolveProductPrice (ProductSelector.tsx:23-27)
    IF v_is_rappi THEN
      v_catalog_price := COALESCE(NULLIF(v_prod_rappi_price, 0), ROUND(v_prod_price * RAPPI_PRICE_MULTIPLIER, 2));
    ELSE
      v_catalog_price := v_prod_price;
    END IF;

    -- authorized_unit_price: mirrors rewardedPrice (loyaltyUtils.ts)
    IF v_loyalty_reward = '50_postre' THEN
      v_authorized_price := v_catalog_price / 2;
    ELSIF v_loyalty_reward = 'bebida_gratis' THEN
      v_authorized_price := 0;
    ELSE
      v_authorized_price := v_catalog_price;
    END IF;

    -- Tolerance check
    IF ABS(v_unit_price - v_authorized_price) > PRICE_TOLERANCE THEN
      RAISE EXCEPTION 'unit_price no coincide con precio autorizado (producto %, esperado %, recibido %)',
        v_product_id, v_authorized_price, v_unit_price;
    END IF;

    -- unit_cost snapshot integrity (mirrors products.manufacturing_cost)
    IF ABS(v_unit_cost - v_prod_mfg_cost) > PRICE_TOLERANCE THEN
      RAISE EXCEPTION 'unit_cost no coincide con costo de fabricación (producto %, esperado %, recibido %)',
        v_product_id, v_prod_mfg_cost, v_unit_cost;
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 5. Insert sales row
  -- -------------------------------------------------------------------------
  INSERT INTO public.sales (
    order_type,
    total_price,
    discount_amount,
    commission,
    customer_id,
    table_number,
    notes,
    user_id,
    payment_method,
    payment_date,
    cash_amount,
    plin_amount,
    cash_received,
    sale_date
  ) VALUES (
    v_order_type,
    v_total_price,
    v_discount_amount,
    v_commission,
    v_customer_id,
    CASE WHEN v_order_type = 'Mesa' THEN v_table_number ELSE NULL END,
    NULLIF(v_notes, ''),
    v_user_id,
    NULLIF(p_payload->'payment'->>'payment_method', ''),
    CASE
      WHEN (p_payload->'payment'->>'payment_method') IS NOT NULL
       AND (p_payload->'payment'->>'payment_method') <> ''
      THEN COALESCE(
        NULLIF(p_payload->'payment'->>'payment_date', ''),
        now()::text
      )::timestamptz
      ELSE NULL
    END,
    (p_payload->'payment'->>'cash_amount')::numeric,
    (p_payload->'payment'->>'plin_amount')::numeric,
    (p_payload->'payment'->>'cash_received')::numeric,
    now()
  )
  RETURNING id INTO v_sale_id;

  -- -------------------------------------------------------------------------
  -- 6. Insert sale_products rows (skip 'Entregado' — mirrors buildSaleProductRows)
  -- -------------------------------------------------------------------------
  INSERT INTO public.sale_products (
    sale_id, product_id, quantity, unit_price, unit_cost,
    temperatura, tipo_leche, loyalty_reward, discount_amount, status
  )
  SELECT
    v_sale_id,
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

  -- -------------------------------------------------------------------------
  -- 7. Register payment via replace_sale_transactions (reuses its validation
  --    logic and balance-update path — it is SECURITY DEFINER and tx-safe,
  --    as confirmed by T1.1 dossier; no need to duplicate its logic here).
  -- -------------------------------------------------------------------------
  IF v_register_payment AND (p_payload->'payment'->>'payment_method') IS NOT NULL
     AND (p_payload->'payment'->>'payment_method') <> '' THEN

    -- Build the payments jsonb array (same structure as buildSalePayments TS helper).
    -- The client passes a pre-built payments array in the payload; use it directly
    -- so the split logic (Efectivo+Plin proportions, net amounts) stays in TS
    -- while replace_sale_transactions handles the balance math.
    v_payments := p_payload->'payment_entries';

    IF v_payments IS NULL OR jsonb_array_length(v_payments) = 0 THEN
      -- Fallback: build minimal single-entry array from the net amount.
      -- Full split logic lives in buildSalePayments (TS); client should always
      -- pass payment_entries. This fallback handles edge cases.
      DECLARE
        v_account_id bigint;
        v_net        numeric;
        v_method     text;
      BEGIN
        v_method := p_payload->'payment'->>'payment_method';
        v_net    := GREATEST(0, ROUND(v_discounted_sub - COALESCE(v_commission, 0), 2));

        IF v_method = 'Rappi' THEN
          v_account_id := (p_payload->'accounts'->>'rappi_id')::bigint;
          IF v_account_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró la cuenta Rappi';
          END IF;
        ELSIF v_method = 'POS' THEN
          v_account_id := (p_payload->'accounts'->>'pos_id')::bigint;
          IF v_account_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró la cuenta POS';
          END IF;
        ELSIF v_method = 'Plin' THEN
          v_account_id := (p_payload->'accounts'->>'banco_id')::bigint;
          IF v_account_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró la cuenta Bancaria';
          END IF;
        ELSE
          -- Efectivo or Efectivo + Plin (simplified fallback)
          v_account_id := (p_payload->'accounts'->>'caja_id')::bigint;
          IF v_account_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró la cuenta Caja';
          END IF;
        END IF;

        IF v_net > 0 THEN
          v_payments := jsonb_build_array(
            jsonb_build_object(
              'account_id', v_account_id,
              'type', 'ingreso_venta',
              'amount', v_net,
              'description', 'Venta #' || v_sale_id::text || ' - ' || v_method || ' (neto)'
            )
          );
        ELSE
          v_payments := '[]'::jsonb;
        END IF;
      END;
    END IF;

    -- PERFORM (not SELECT INTO) because replace_sale_transactions returns void.
    PERFORM public.replace_sale_transactions(v_sale_id, v_payments, v_user_id);
  END IF;

  RETURN v_sale_id;
END;
$$;

-- Security: revoke broad access, grant only to authenticated users.
REVOKE EXECUTE ON FUNCTION public.create_sale_atomic(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_sale_atomic(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_sale_atomic(jsonb) TO authenticated;

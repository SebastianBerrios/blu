-- =============================================================================
-- Migration: 20260706T02_create_purchase_atomic
-- Purpose  : Atomic RPC for purchase creation. Replaces 4 round-trips
--            (INSERT purchases → INSERT purchase_items →
--             apply_purchase_inventory → replace_purchase_transactions)
--            with a single transaction so a mid-flight failure can never
--            orphan a purchase from its inventory movements or transactions.
--
-- Rollback : DROP FUNCTION IF EXISTS public.create_purchase_atomic(jsonb);
--            The client service reverts to the pre-change purchasesService.createPurchase
--            via `git revert` of the T1.6 service commit.
--
-- Sync pairs (SQL ↔ TypeScript — must be kept in lockstep):
--   • buildPurchasePayments() in purchasesService.ts ↔ payment validation block
--     (replace_purchase_transactions is called here instead of duplicating its
--      full validation logic — it is already SECURITY DEFINER and tx-safe)
--   • apply_purchase_inventory() RPC ↔ PERFORM below (reused, not duplicated)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_purchase_atomic(p_payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase_id  bigint;
  v_user_id      uuid;

  -- Header fields
  v_has_delivery  boolean;
  v_delivery_cost numeric;
  v_total         numeric;
  v_notes         text;
  v_account_id    bigint;
  v_plin_change   numeric;

  -- Item iteration
  v_item         jsonb;
  v_item_price   numeric;

  -- Payment entries
  v_payments     jsonb;
BEGIN
  -- Authenticated user from session (not trusted from client)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- -------------------------------------------------------------------------
  -- 1. Parse and validate header
  -- -------------------------------------------------------------------------
  v_has_delivery  := COALESCE((p_payload->'header'->>'has_delivery')::boolean, false);
  v_delivery_cost := (p_payload->'header'->>'delivery_cost')::numeric;
  v_total         := (p_payload->'header'->>'total')::numeric;
  v_notes         := NULLIF(TRIM(p_payload->'header'->>'notes'), '');
  v_account_id    := (p_payload->'header'->>'account_id')::bigint;
  v_plin_change   := COALESCE((p_payload->'header'->>'plin_change')::numeric, 0);

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'El total de la compra debe ser mayor a 0';
  END IF;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Selecciona una cuenta para la compra';
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. Validate items (price > 0 check)
  -- -------------------------------------------------------------------------
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_item_price := (v_item->>'price')::numeric;
    IF v_item_price IS NULL OR v_item_price <= 0 THEN
      RAISE EXCEPTION 'El precio de cada ítem debe ser mayor a 0 (ítem: %)', COALESCE(v_item->>'item_name', 'desconocido');
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 3. Insert purchases row (user_id from auth.uid() — server-side)
  -- -------------------------------------------------------------------------
  INSERT INTO public.purchases (
    user_id,
    has_delivery,
    delivery_cost,
    total,
    notes,
    account_id,
    plin_change
  ) VALUES (
    v_user_id,
    v_has_delivery,
    CASE WHEN v_has_delivery THEN v_delivery_cost ELSE NULL END,
    v_total,
    v_notes,
    v_account_id,
    CASE WHEN v_plin_change > 0 THEN v_plin_change ELSE NULL END
  )
  RETURNING id INTO v_purchase_id;

  -- -------------------------------------------------------------------------
  -- 4. Insert purchase_items
  -- -------------------------------------------------------------------------
  INSERT INTO public.purchase_items (
    purchase_id, item_name, ingredient_id, price, quantity, unit
  )
  SELECT
    v_purchase_id,
    item->>'item_name',
    NULLIF(item->>'ingredient_id', '')::bigint,
    (item->>'price')::numeric,
    NULLIF(item->>'quantity', '')::numeric,
    NULLIF(item->>'unit', '')
  FROM jsonb_array_elements(p_payload->'items') AS item;

  -- -------------------------------------------------------------------------
  -- 5. Apply inventory via existing SECURITY DEFINER RPC (reuse, don't dup)
  --    apply_purchase_inventory handles unit conversion via _convert_qty +
  --    unit_weight_g and inserts inventory_movements reason 'compra'.
  -- -------------------------------------------------------------------------
  PERFORM public.apply_purchase_inventory(
    v_purchase_id,
    v_user_id,
    NULLIF(p_payload->'header'->>'user_name', '')
  );

  -- -------------------------------------------------------------------------
  -- 6. Record transactions via replace_purchase_transactions (reuse, don't dup)
  --    replace_purchase_transactions validates sum == -total ±0.01 and that
  --    types are in ('egreso_compra','ingreso_extra'). It is SECURITY DEFINER
  --    and tx-safe (confirmed by T1.1 dossier).
  -- -------------------------------------------------------------------------
  v_payments := p_payload->'payments';

  IF v_payments IS NULL OR jsonb_array_length(v_payments) = 0 THEN
    RAISE EXCEPTION 'Se requiere al menos un método de pago';
  END IF;

  PERFORM public.replace_purchase_transactions(v_purchase_id, v_payments, v_user_id);

  RETURN v_purchase_id;
END;
$$;

-- Security: revoke broad access, grant only to authenticated users.
REVOKE EXECUTE ON FUNCTION public.create_purchase_atomic(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_purchase_atomic(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_purchase_atomic(jsonb) TO authenticated;

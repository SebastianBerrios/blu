-- =============================================================================
-- Migration: 20260706T03_delete_hardening
-- Purpose  : Harden DELETE paths for sales and purchases:
--            1. Drop RLS DELETE policies so direct REST DELETE is blocked.
--            2. Gate delete_sale_atomic on has_permission('sales.delete').
--            3. Gate delete_purchase_atomic on has_permission('purchases.delete').
--            4. Insert 'purchases.delete' permission (admin-only, enabled=true).
--
-- After this migration, deletion of sales/purchases is ONLY possible via the
-- atomic RPCs, which enforce permission checks and clean up transactions +
-- inventory atomically.
--
-- Rollback (recreate the dropped policies and revert RPC bodies):
--
--   -- 1. Restore sales DELETE policy
--   CREATE POLICY admin_delete_sales ON public.sales FOR DELETE TO authenticated
--     USING (has_permission('sales.delete'::text));
--
--   -- 2. Restore purchases DELETE policy (was hardcoded admin check)
--   CREATE POLICY admin_delete_purchases ON public.purchases FOR DELETE TO authenticated
--     USING (EXISTS (SELECT 1 FROM user_profiles
--                    WHERE user_profiles.id = (SELECT auth.uid())
--                    AND user_profiles.role = 'admin'::app_role));
--
--   -- 3. Revert delete_sale_atomic to prior admin check (see git history for body)
--   -- 4. Revert delete_purchase_atomic to prior admin check (see git history)
--   -- 5. Remove inserted role_permissions row:
--   DELETE FROM public.role_permissions
--     WHERE permission = 'purchases.delete' AND role = 'admin';
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the RLS DELETE policy on sales (T1.1 dossier: admin_delete_sales)
--    After this, no role can DELETE sales rows directly via REST.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_delete_sales ON public.sales;

-- ---------------------------------------------------------------------------
-- 2. Drop the RLS DELETE policy on purchases (T1.1 dossier: admin_delete_purchases)
--    After this, no role can DELETE purchases rows directly via REST.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_delete_purchases ON public.purchases;

-- ---------------------------------------------------------------------------
-- 3. Harden delete_sale_atomic: replace hardcoded admin check with
--    has_permission('sales.delete', p_user_id).
--    Only the permission check and the function header are changed;
--    the rest of the body (reverse_inventory_for_sale → delete_sale_transactions
--    → DELETE sales) is preserved exactly.
--
--    NOTE: The full body is reproduced here to avoid a partial ALTER.
--    Source of truth for the pre-change body is git history (T1.1 dossier).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_sale_atomic(
  p_sale_id  bigint,
  p_user_id  uuid    DEFAULT auth.uid(),
  p_user_name text   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Permission check via role_permissions table (replaces hardcoded admin check).
  IF NOT public.has_permission('sales.delete', p_user_id) THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar ventas';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sales WHERE id = p_sale_id) THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  -- Reverse inventory movements caused by delivered items in this sale.
  PERFORM public.reverse_inventory_for_sale(p_sale_id, p_user_id, p_user_name);

  -- Delete all transactions associated with this sale.
  PERFORM public.delete_sale_transactions(p_sale_id);

  -- Delete the sale itself (cascades to sale_products via FK if configured,
  -- or sale_products rows must already be cleaned up by the inventory reversal).
  DELETE FROM public.sales WHERE id = p_sale_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_sale_atomic(bigint, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_sale_atomic(bigint, uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.delete_sale_atomic(bigint, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Harden delete_purchase_atomic: replace hardcoded admin check with
--    has_permission('purchases.delete', p_user_id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_purchase_atomic(
  p_purchase_id bigint,
  p_user_id     uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_name text;
BEGIN
  -- Permission check via role_permissions table (replaces hardcoded admin check).
  IF NOT public.has_permission('purchases.delete', p_user_id) THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar compras';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.purchases WHERE id = p_purchase_id) THEN
    RAISE EXCEPTION 'Compra no encontrada';
  END IF;

  SELECT full_name INTO v_user_name FROM public.user_profiles WHERE id = p_user_id;

  -- Reverse inventory movements caused by items in this purchase.
  PERFORM public.reverse_purchase_inventory(p_purchase_id, p_user_id, v_user_name);

  -- Delete all transactions associated with this purchase.
  PERFORM public.delete_purchase_transactions(p_purchase_id);

  -- Delete the purchase itself (cascades to purchase_items via FK).
  DELETE FROM public.purchases WHERE id = p_purchase_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_purchase_atomic(bigint, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_purchase_atomic(bigint, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.delete_purchase_atomic(bigint, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Insert 'purchases.delete' permission row for admin role.
--    enabled = true only for admin (per correction #17 in corrections artifact).
--    The role_permissions table columns (from database.ts):
--      permission text PK, role app_role PK, enabled boolean, updated_at, updated_by
-- ---------------------------------------------------------------------------
INSERT INTO public.role_permissions (permission, role, enabled)
VALUES ('purchases.delete', 'admin', true)
ON CONFLICT (permission, role) DO UPDATE
  SET enabled    = EXCLUDED.enabled,
      updated_at = now();

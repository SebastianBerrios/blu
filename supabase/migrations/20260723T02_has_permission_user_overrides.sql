-- permissions-full-control Phase 1: has_permission gains a per-user override branch.
-- Resolution order MUST stay identical to resolvePermission() in
-- src/features/usuarios/services/permissionsResolver.ts:
--   1. admin short-circuit (user_profiles.role='admin')      -> TRUE
--   2. user_permissions row EXISTS for (user, perm)          -> that row's enabled
--   3. role_permissions row EXISTS for (role, perm)          -> that row's enabled
--   4. otherwise                                             -> FALSE
-- CRITICAL: keep DEFAULT auth.uid() — single-arg callers (discard_inventory,
-- produce_recipe_batch, adjust_inventory_manual, reverse_production,
-- delete_sale_atomic, delete_purchase_atomic) rely on it.
-- Rollback: re-run the previous 3-branch body (admin -> role_permissions -> false).

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    -- branch 1: admin invariant (never data-driven)
    WHEN EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = p_user_id AND up.role = 'admin'
    ) THEN true
    -- branch 2: per-user override wins if a row EXISTS (force-OFF must deny)
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions uperm
      WHERE uperm.user_id = p_user_id AND uperm.permission = p_permission
    ) THEN (
      SELECT uperm.enabled FROM public.user_permissions uperm
      WHERE uperm.user_id = p_user_id AND uperm.permission = p_permission
    )
    -- branch 3: role default if a role_permissions row EXISTS
    WHEN EXISTS (
      SELECT 1 FROM public.role_permissions rp
      JOIN public.user_profiles up ON up.role = rp.role
      WHERE up.id = p_user_id AND rp.permission = p_permission
    ) THEN (
      SELECT rp.enabled FROM public.role_permissions rp
      JOIN public.user_profiles up ON up.role = rp.role
      WHERE up.id = p_user_id AND rp.permission = p_permission
    )
    -- branch 4: default deny
    ELSE false
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_permission(text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_permission(text, uuid) TO authenticated;

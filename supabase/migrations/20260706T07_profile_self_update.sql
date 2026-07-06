-- Migration: user_profiles self-update policy + column-guard trigger
-- Phase 5 / T5.5
-- Rollback: DROP TRIGGER trg_guard_profile_privileged_cols ON public.user_profiles;
--           DROP FUNCTION public.fn_guard_profile_privileged_cols();
--           DROP POLICY user_profiles_self_update ON public.user_profiles;

-- Owner self-update policy (row-level: only your own row).
-- Column-level guard is enforced by the trigger below.
-- Both UPDATE policies are permissive (OR logic):
--   admin (JWT claim)  OR  owner (id = auth.uid())
-- Trigger enforces column-level restriction for everyone.
CREATE POLICY user_profiles_self_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Column guard: RLS cannot restrict which columns are changed, so a
-- BEFORE UPDATE trigger blocks non-admins from changing role or is_active.
-- Admins (looked up live in user_profiles) may change them; this is what
-- setUserRole / toggleUserActive rely on.
CREATE OR REPLACE FUNCTION public.fn_guard_profile_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Solo administradores pueden cambiar el rol o el estado activo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_cols ON public.user_profiles;
CREATE TRIGGER trg_guard_profile_privileged_cols
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_profile_privileged_cols();

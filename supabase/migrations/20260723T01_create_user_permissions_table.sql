-- permissions-full-control Phase 1: per-user permission overrides.
-- Tri-state via row presence: no row = inherit; enabled=true = force-ON; enabled=false = force-OFF.
-- Rollback: DROP TABLE IF EXISTS public.user_permissions;

CREATE TABLE public.user_permissions (
  user_id    uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  permission text        NOT NULL,
  enabled    boolean     NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows, or admin sees all.
CREATE POLICY user_permissions_select ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles
               WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- INSERT/UPDATE/DELETE: admin-only (matches role_permissions write model).
CREATE POLICY user_permissions_insert ON public.user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY user_permissions_update ON public.user_permissions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY user_permissions_delete ON public.user_permissions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'));

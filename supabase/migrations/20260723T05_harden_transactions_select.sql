-- Fase 2 Area C: restrict transactions SELECT to admin (was authenticated_read_transactions
-- with qual:true — world-readable). APPLIED to the DB during PR3.
-- Safe: every transactions reader (finanzas admin-gated, estadisticas guarded via PR #4,
-- dailySummaryService in finanzas) is admin-only. record_transaction (SECURITY DEFINER write)
-- is unaffected. Verified via role-simulation: non-admin sees 0 rows, admin sees all.
DROP POLICY IF EXISTS authenticated_read_transactions ON public.transactions;
CREATE POLICY transactions_admin_read ON public.transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'));

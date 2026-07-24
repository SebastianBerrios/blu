-- Fase 2 Area C: restrict accounts SELECT to admin (was authenticated_read_accounts with
-- qual:true — account balances world-readable to any authenticated user).
--
-- ⚠️ DEPLOY-ORDERED: apply this ONLY AFTER the PR3 code (usePaymentAccounts + rewired
-- PaymentModal/SaleForm/PurchaseForm/AccountSelector) is DEPLOYED to production. Applying it
-- before deploy breaks non-admin payment registration, because the still-deployed old code
-- reads accounts directly via useAccounts(). Non-admin payment flows obtain the minimal
-- {id,type,name} list via the SECURITY DEFINER RPC get_payment_accounts() instead.
--
-- Admin finance pages/forms keep direct accounts SELECT (this policy allows admin).
DROP POLICY IF EXISTS authenticated_read_accounts ON public.accounts;
CREATE POLICY accounts_admin_read ON public.accounts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'));

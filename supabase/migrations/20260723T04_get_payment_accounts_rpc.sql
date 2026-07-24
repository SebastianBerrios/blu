CREATE OR REPLACE FUNCTION public.get_payment_accounts()
RETURNS TABLE (id bigint, type text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT a.id, a.type, a.name FROM public.accounts a ORDER BY a.id; $$;
REVOKE EXECUTE ON FUNCTION public.get_payment_accounts() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_payment_accounts() TO authenticated;

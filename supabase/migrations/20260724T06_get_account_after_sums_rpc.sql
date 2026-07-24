-- Issue #17: fetchDailySummary hacía over-fetch sin cota superior — traía TODAS
-- las transacciones con created_at > fin-de-día solo para reconstruir el saldo de
-- cierre (closingBalance = saldo_actual − Σ(tx posteriores)). Para días viejos eso
-- puede ser miles de filas enviadas al cliente.
--
-- Este RPC agrega esa suma server-side y devuelve una fila por cuenta. SECURITY
-- INVOKER: respeta la RLS de transactions (SELECT admin-only), igual que el fetch
-- directo que reemplaza — finanzas es admin-only, así que la paridad se mantiene.

CREATE OR REPLACE FUNCTION public.get_account_after_sums(p_after timestamptz)
 RETURNS TABLE(account_id bigint, after_sum numeric)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT t.account_id, COALESCE(SUM(t.amount), 0)::numeric AS after_sum
  FROM public.transactions t
  WHERE t.created_at > p_after
  GROUP BY t.account_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_account_after_sums(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_after_sums(timestamptz) TO authenticated;

import { createClient } from "@/utils/supabase/client";
import { localDayRangeISO } from "@/utils/helpers/dateFormatters";
import {
  generateCashChangeAlerts,
  generateYapeChangeAlerts,
  generateManualAdjustmentAlerts,
  generateSaleEditAlerts,
  type DailyAlert,
} from "./dailySummaryAlerts";

export type { DailyAlert, DailyAlertType } from "./dailySummaryAlerts";

export interface DailyAccountSummary {
  accountId: number;
  accountType: string; // "caja" | "banco"
  accountName: string;
  ingresos: number;
  egresos: number;
  net: number;
  closingBalance: number;
  currentBalance: number;
}

export interface DailySummary {
  date: string;
  perAccount: DailyAccountSummary[];
  alerts: DailyAlert[];
  totalIngresos: number;
  totalEgresos: number;
  totalNet: number;
}

export async function fetchDailySummary(dateKey: string): Promise<DailySummary> {
  const { start, end } = localDayRangeISO(dateKey);
  const supabase = createClient();

  const [
    accountsRes,
    transactionsRes,
    salesRes,
    purchasesRes,
    auditLogsRes,
    postTransactionsRes,
  ] = await Promise.all([
    supabase.from("accounts").select("*").order("id"),
    supabase
      .from("transactions")
      .select("*")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("id, total_price, cash_amount, cash_received, sale_date, payment_method")
      .gte("sale_date", start)
      .lte("sale_date", end),
    supabase
      .from("purchases")
      .select("id, yape_change, total, created_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .gt("yape_change", 0),
    supabase
      .from("audit_logs")
      .select("id, action, target_table, target_id, target_description, details, created_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .eq("target_table", "sales"),
    supabase
      .from("transactions")
      .select("account_id, amount")
      .gt("created_at", end),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (transactionsRes.error) throw transactionsRes.error;
  if (salesRes.error) throw salesRes.error;
  if (purchasesRes.error) throw purchasesRes.error;
  if (auditLogsRes.error) throw auditLogsRes.error;
  if (postTransactionsRes.error) throw postTransactionsRes.error;

  const accounts = accountsRes.data ?? [];
  const transactions = transactionsRes.data ?? [];
  const sales = salesRes.data ?? [];
  const purchases = purchasesRes.data ?? [];
  const auditLogs = auditLogsRes.data ?? [];
  const postTransactions = postTransactionsRes.data ?? [];

  const perAccount: DailyAccountSummary[] = accounts.map((a) => {
    const dayTx = transactions.filter((t) => t.account_id === a.id);
    const ingresos = dayTx
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const egresos = dayTx
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const afterSum = postTransactions
      .filter((t) => t.account_id === a.id)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const currentBalance = Number(a.balance);
    return {
      accountId: a.id,
      accountType: a.type,
      accountName: a.name,
      ingresos,
      egresos,
      net: ingresos - egresos,
      closingBalance: currentBalance - afterSum,
      currentBalance,
    };
  });

  const totalIngresos = perAccount.reduce((s, a) => s + a.ingresos, 0);
  const totalEgresos = perAccount.reduce((s, a) => s + a.egresos, 0);
  const totalNet = totalIngresos - totalEgresos;

  const alerts: DailyAlert[] = [
    ...generateCashChangeAlerts(sales),
    ...generateYapeChangeAlerts(purchases),
    ...generateManualAdjustmentAlerts(transactions),
    ...generateSaleEditAlerts(auditLogs),
  ];

  return {
    date: dateKey,
    perAccount,
    alerts,
    totalIngresos,
    totalEgresos,
    totalNet,
  };
}

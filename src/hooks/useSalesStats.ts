import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type {
  SalesKPIs,
  RevenueByDay,
  RevenueByPaymentMethod,
  TopProduct,
  SalesByOrderType,
  SalesByHour,
  RevenueVsExpenses,
  DateRange,
} from "@/types";
import { toLocalDateKey } from "@/hooks/useSales";

interface SaleRow {
  id: number;
  sale_date: string;
  total_price: number;
  order_type: string;
  payment_method: string | null;
  cash_amount: number | null;
  yape_amount: number | null;
  sale_products: Array<{
    quantity: number;
    unit_price: number;
    products: { name: string };
  }>;
}

interface StatsData {
  kpis: SalesKPIs;
  revenueByDay: RevenueByDay[];
  revenueByMethod: RevenueByPaymentMethod[];
  topProducts: TopProduct[];
  salesByOrderType: SalesByOrderType[];
  salesByHour: SalesByHour[];
  revenueVsExpenses: RevenueVsExpenses[];
}

const fetchStats = async (dateRange: DateRange): Promise<StatsData> => {
  const supabase = createClient();

  const [salesRes, expensesRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, sale_date, total_price, order_type, payment_method, cash_amount, yape_amount, sale_products(quantity, unit_price, products(name))")
      .not("payment_method", "is", null)
      .gte("sale_date", dateRange.startDate)
      .lte("sale_date", dateRange.endDate),
    supabase
      .from("transactions")
      .select("amount, type, created_at")
      .in("type", ["gasto", "egreso_compra"])
      .gte("created_at", dateRange.startDate)
      .lte("created_at", dateRange.endDate),
  ]);

  if (salesRes.error) throw new Error(salesRes.error.message);
  if (expensesRes.error) throw new Error(expensesRes.error.message);

  const sales = (salesRes.data || []) as unknown as SaleRow[];
  const expenses = expensesRes.data || [];

  // KPIs
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dailyRevenue = sales
    .filter((s) => toLocalDateKey(s.sale_date) === today)
    .reduce((sum, s) => sum + s.total_price, 0);
  const monthlyRevenue = sales
    .filter((s) => toLocalDateKey(s.sale_date).slice(0, 7) === monthStart)
    .reduce((sum, s) => sum + s.total_price, 0);
  const totalSales = sales.length;
  const avgTicket = totalSales > 0 ? sales.reduce((sum, s) => sum + s.total_price, 0) / totalSales : 0;
  const productsSold = sales.reduce(
    (sum, s) => sum + s.sale_products.reduce((ps, sp) => ps + sp.quantity, 0),
    0
  );

  const kpis: SalesKPIs = { dailyRevenue, monthlyRevenue, avgTicket, productsSold, totalSales };

  // Revenue by day
  const revByDayMap: Record<string, number> = {};
  for (const s of sales) {
    const date = toLocalDateKey(s.sale_date);
    revByDayMap[date] = (revByDayMap[date] || 0) + s.total_price;
  }
  const revenueByDay: RevenueByDay[] = Object.entries(revByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // Revenue by payment method
  const revByMethodMap: Record<string, number> = {};
  for (const s of sales) {
    const method = s.payment_method ?? "Otro";
    revByMethodMap[method] = (revByMethodMap[method] || 0) + s.total_price;
  }
  const revenueByMethod: RevenueByPaymentMethod[] = Object.entries(revByMethodMap)
    .map(([method, total]) => ({ method, total }));

  // Top products
  const productMap: Record<string, { revenue: number; quantity: number }> = {};
  for (const s of sales) {
    for (const sp of s.sale_products) {
      const name = sp.products?.name ?? "Desconocido";
      if (!productMap[name]) productMap[name] = { revenue: 0, quantity: 0 };
      productMap[name].revenue += sp.quantity * sp.unit_price;
      productMap[name].quantity += sp.quantity;
    }
  }
  const topProducts: TopProduct[] = Object.entries(productMap)
    .map(([productName, { revenue, quantity }]) => ({
      productName,
      totalRevenue: revenue,
      quantitySold: quantity,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Sales by order type
  const orderTypeMap: Record<string, { count: number; revenue: number }> = {};
  for (const s of sales) {
    if (!orderTypeMap[s.order_type]) orderTypeMap[s.order_type] = { count: 0, revenue: 0 };
    orderTypeMap[s.order_type].count++;
    orderTypeMap[s.order_type].revenue += s.total_price;
  }
  const salesByOrderType: SalesByOrderType[] = Object.entries(orderTypeMap)
    .map(([orderType, { count, revenue }]) => ({ orderType, count, revenue }));

  // Sales by hour
  const hourMap: Record<number, { count: number; revenue: number }> = {};
  for (const s of sales) {
    const hour = new Date(s.sale_date).getHours();
    if (!hourMap[hour]) hourMap[hour] = { count: 0, revenue: 0 };
    hourMap[hour].count++;
    hourMap[hour].revenue += s.total_price;
  }
  const salesByHour: SalesByHour[] = Object.entries(hourMap)
    .map(([h, { count, revenue }]) => ({ hour: parseInt(h), count, revenue }))
    .sort((a, b) => a.hour - b.hour);

  // Revenue vs expenses by day
  const expByDayMap: Record<string, number> = {};
  for (const e of expenses) {
    const date = toLocalDateKey(e.created_at);
    expByDayMap[date] = (expByDayMap[date] || 0) + Math.abs(e.amount);
  }
  const allDates = new Set([...Object.keys(revByDayMap), ...Object.keys(expByDayMap)]);
  const revenueVsExpenses: RevenueVsExpenses[] = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      revenue: revByDayMap[date] || 0,
      expenses: expByDayMap[date] || 0,
    }));

  return { kpis, revenueByDay, revenueByMethod, topProducts, salesByOrderType, salesByHour, revenueVsExpenses };
};

export const useSalesStats = (dateRange: DateRange) => {
  const { data, error, isLoading } = useSWR<StatsData>(
    ["sales-stats", dateRange],
    () => fetchStats(dateRange),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    kpis: data?.kpis ?? { dailyRevenue: 0, monthlyRevenue: 0, avgTicket: 0, productsSold: 0, totalSales: 0 },
    revenueByDay: data?.revenueByDay ?? [],
    revenueByMethod: data?.revenueByMethod ?? [],
    topProducts: data?.topProducts ?? [],
    salesByOrderType: data?.salesByOrderType ?? [],
    salesByHour: data?.salesByHour ?? [],
    revenueVsExpenses: data?.revenueVsExpenses ?? [],
    error,
    isLoading,
  };
};

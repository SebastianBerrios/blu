import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type {
  SalesKPIsWithDelta,
  KPIValue,
  RevenueByDay,
  RevenueByPaymentMethod,
  TopProduct,
  SalesByOrderType,
  SalesByHour,
  RevenueVsExpenses,
  HeatmapCell,
  PeriodRanges,
  Granularity,
} from "@/types";
import { toLocalDateKey } from "@/utils/helpers/groupByDate";

interface SaleRow {
  id: number;
  sale_date: string;
  total_price: number;
  order_type: string;
  payment_method: string | null;
  cash_amount: number | null;
  plin_amount: number | null;
  sale_products: Array<{
    quantity: number;
    unit_price: number;
    products: { name: string; manufacturing_cost: number | null } | null;
  }>;
}

interface ExpenseRow {
  amount: number;
  type: string;
  created_at: string;
}

interface BaseAggregates {
  revenue: number;
  totalSales: number;
  productsSold: number;
  grossCost: number;
}

interface StatsData {
  kpis: SalesKPIsWithDelta;
  revenueByBucket: RevenueByDay[];
  previousRevenueByBucket: RevenueByDay[];
  revenueByMethod: RevenueByPaymentMethod[];
  topProducts: TopProduct[];
  salesByOrderType: SalesByOrderType[];
  salesByHour: SalesByHour[];
  revenueVsExpenses: RevenueVsExpenses[];
  heatmap: HeatmapCell[];
  sparkline: number[];
  ranges: PeriodRanges;
}

const SELECT_CLAUSE =
  "id, sale_date, total_price, order_type, payment_method, cash_amount, plin_amount, sale_products(quantity, unit_price, products(name, manufacturing_cost))";

async function fetchSales(start: string, end: string): Promise<SaleRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(SELECT_CLAUSE)
    .not("payment_method", "is", null)
    .gte("sale_date", start)
    .lte("sale_date", end);
  if (error) throw new Error(error.message);
  return (data || []) as unknown as SaleRow[];
}

async function fetchExpenses(start: string, end: string): Promise<ExpenseRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, created_at")
    .in("type", ["gasto", "egreso_compra"])
    .gte("created_at", start)
    .lte("created_at", end);
  if (error) throw new Error(error.message);
  return (data || []) as ExpenseRow[];
}

function aggregateBase(sales: SaleRow[]): BaseAggregates {
  let revenue = 0;
  let productsSold = 0;
  let grossCost = 0;
  for (const s of sales) {
    revenue += Number(s.total_price) || 0;
    for (const sp of s.sale_products) {
      const qty = Number(sp.quantity) || 0;
      productsSold += qty;
      const cost = Number(sp.products?.manufacturing_cost ?? 0) || 0;
      grossCost += qty * cost;
    }
  }
  return { revenue, productsSold, grossCost, totalSales: sales.length };
}

function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function toKPIValue(current: number, previous: number): KPIValue {
  return { current, previous, deltaPct: computeDelta(current, previous) };
}

function bucketKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr);
  if (granularity === "hour") {
    return `${toLocalDateKey(dateStr)}T${String(d.getHours()).padStart(2, "0")}`;
  }
  if (granularity === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return toLocalDateKey(dateStr);
}

function groupRevenueByBucket(
  sales: SaleRow[],
  granularity: Granularity,
): RevenueByDay[] {
  const map = new Map<string, number>();
  for (const s of sales) {
    const key = bucketKey(s.sale_date, granularity);
    map.set(key, (map.get(key) || 0) + Number(s.total_price || 0));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

async function fetchStats(ranges: PeriodRanges): Promise<StatsData> {
  const sparkStart = new Date();
  sparkStart.setDate(sparkStart.getDate() - 6);
  sparkStart.setHours(0, 0, 0, 0);
  const sparkEnd = new Date();
  sparkEnd.setHours(23, 59, 59, 999);
  const sparkStartISO = sparkStart.toISOString();
  const sparkEndISO = sparkEnd.toISOString();

  const [currentSales, previousSales, sparkSales, expenses] = await Promise.all([
    fetchSales(ranges.current.start, ranges.current.end),
    fetchSales(ranges.previous.start, ranges.previous.end),
    fetchSales(sparkStartISO, sparkEndISO),
    fetchExpenses(ranges.current.start, ranges.current.end),
  ]);

  const curAgg = aggregateBase(currentSales);
  const prevAgg = aggregateBase(previousSales);

  const curAvgTicket = curAgg.totalSales > 0 ? curAgg.revenue / curAgg.totalSales : 0;
  const prevAvgTicket = prevAgg.totalSales > 0 ? prevAgg.revenue / prevAgg.totalSales : 0;

  const curGrossMargin = curAgg.revenue - curAgg.grossCost;
  const prevGrossMargin = prevAgg.revenue - prevAgg.grossCost;
  const curGrossMarginPct = curAgg.revenue > 0 ? (curGrossMargin / curAgg.revenue) * 100 : 0;
  const prevGrossMarginPct = prevAgg.revenue > 0 ? (prevGrossMargin / prevAgg.revenue) * 100 : 0;

  const kpis: SalesKPIsWithDelta = {
    revenue: toKPIValue(curAgg.revenue, prevAgg.revenue),
    avgTicket: toKPIValue(curAvgTicket, prevAvgTicket),
    productsSold: toKPIValue(curAgg.productsSold, prevAgg.productsSold),
    totalSales: toKPIValue(curAgg.totalSales, prevAgg.totalSales),
    grossMargin: toKPIValue(curGrossMargin, prevGrossMargin),
    grossMarginPct: toKPIValue(curGrossMarginPct, prevGrossMarginPct),
  };

  const revenueByBucket = groupRevenueByBucket(currentSales, ranges.granularity);
  const previousRevenueByBucket = groupRevenueByBucket(previousSales, ranges.granularity);

  // Revenue by payment method
  const revByMethodMap: Record<string, number> = {};
  for (const s of currentSales) {
    const method = s.payment_method ?? "Otro";
    revByMethodMap[method] = (revByMethodMap[method] || 0) + Number(s.total_price || 0);
  }
  const revenueByMethod: RevenueByPaymentMethod[] = Object.entries(revByMethodMap).map(
    ([method, total]) => ({ method, total }),
  );

  // Top products
  const productMap: Record<string, { revenue: number; quantity: number }> = {};
  for (const s of currentSales) {
    for (const sp of s.sale_products) {
      const name = sp.products?.name ?? "Desconocido";
      if (!productMap[name]) productMap[name] = { revenue: 0, quantity: 0 };
      productMap[name].revenue += Number(sp.quantity) * Number(sp.unit_price);
      productMap[name].quantity += Number(sp.quantity);
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
  for (const s of currentSales) {
    if (!orderTypeMap[s.order_type]) orderTypeMap[s.order_type] = { count: 0, revenue: 0 };
    orderTypeMap[s.order_type].count++;
    orderTypeMap[s.order_type].revenue += Number(s.total_price || 0);
  }
  const salesByOrderType: SalesByOrderType[] = Object.entries(orderTypeMap).map(
    ([orderType, { count, revenue }]) => ({ orderType, count, revenue }),
  );

  // Sales by hour
  const hourMap: Record<number, { count: number; revenue: number }> = {};
  for (const s of currentSales) {
    const hour = new Date(s.sale_date).getHours();
    if (!hourMap[hour]) hourMap[hour] = { count: 0, revenue: 0 };
    hourMap[hour].count++;
    hourMap[hour].revenue += Number(s.total_price || 0);
  }
  const salesByHour: SalesByHour[] = Object.entries(hourMap)
    .map(([h, { count, revenue }]) => ({ hour: parseInt(h), count, revenue }))
    .sort((a, b) => a.hour - b.hour);

  // Heatmap day-of-week × hour
  const heatmapMap = new Map<string, { count: number; revenue: number }>();
  for (const s of currentSales) {
    const d = new Date(s.sale_date);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const hour = d.getHours();
    const key = `${dow}-${hour}`;
    const prev = heatmapMap.get(key) ?? { count: 0, revenue: 0 };
    heatmapMap.set(key, {
      count: prev.count + 1,
      revenue: prev.revenue + Number(s.total_price || 0),
    });
  }
  const heatmap: HeatmapCell[] = Array.from(heatmapMap.entries()).map(([k, v]) => {
    const [dow, hour] = k.split("-").map(Number);
    return { dayOfWeek: dow, hour, count: v.count, revenue: v.revenue };
  });

  // Revenue vs expenses
  const expByDayMap: Record<string, number> = {};
  for (const e of expenses) {
    const date = toLocalDateKey(e.created_at);
    expByDayMap[date] = (expByDayMap[date] || 0) + Math.abs(Number(e.amount) || 0);
  }
  const revDayMap: Record<string, number> = {};
  for (const s of currentSales) {
    const date = toLocalDateKey(s.sale_date);
    revDayMap[date] = (revDayMap[date] || 0) + Number(s.total_price || 0);
  }
  const allDates = new Set([...Object.keys(revDayMap), ...Object.keys(expByDayMap)]);
  const revenueVsExpenses: RevenueVsExpenses[] = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      revenue: revDayMap[date] || 0,
      expenses: expByDayMap[date] || 0,
    }));

  // Sparkline: last 7 days revenue (always anchored on today)
  const sparkMap = new Map<string, number>();
  for (const s of sparkSales) {
    const d = toLocalDateKey(s.sale_date);
    sparkMap.set(d, (sparkMap.get(d) || 0) + Number(s.total_price || 0));
  }
  const sparkline: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    sparkline.push(sparkMap.get(key) || 0);
  }

  return {
    kpis,
    revenueByBucket,
    previousRevenueByBucket,
    revenueByMethod,
    topProducts,
    salesByOrderType,
    salesByHour,
    revenueVsExpenses,
    heatmap,
    sparkline,
    ranges,
  };
}

const EMPTY_KPI: KPIValue = { current: 0, previous: 0, deltaPct: null };

const EMPTY_KPIS: SalesKPIsWithDelta = {
  revenue: EMPTY_KPI,
  avgTicket: EMPTY_KPI,
  productsSold: EMPTY_KPI,
  totalSales: EMPTY_KPI,
  grossMargin: EMPTY_KPI,
  grossMarginPct: EMPTY_KPI,
};

export const useSalesStats = (ranges: PeriodRanges) => {
  const { data, error, isLoading } = useSWR<StatsData>(
    ["sales-stats", ranges],
    () => fetchStats(ranges),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    },
  );

  return {
    kpis: data?.kpis ?? EMPTY_KPIS,
    revenueByBucket: data?.revenueByBucket ?? [],
    previousRevenueByBucket: data?.previousRevenueByBucket ?? [],
    revenueByMethod: data?.revenueByMethod ?? [],
    topProducts: data?.topProducts ?? [],
    salesByOrderType: data?.salesByOrderType ?? [],
    salesByHour: data?.salesByHour ?? [],
    revenueVsExpenses: data?.revenueVsExpenses ?? [],
    heatmap: data?.heatmap ?? [],
    sparkline: data?.sparkline ?? [],
    ranges,
    error,
    isLoading,
  };
};

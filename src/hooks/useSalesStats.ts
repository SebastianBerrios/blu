import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { limaDateKey, limaDayRangeISO } from "@/utils/helpers/dateFormatters";
import {
  aggregateBase,
  groupRevenueByBucket,
  aggregateTopProducts,
  aggregateRevenueVsExpenses,
  aggregateSalesByHour,
  aggregateHeatmap,
  aggregateRevenueByMethod,
  aggregateSalesByOrderType,
  toKPIValue,
} from "@/features/estadisticas/services/statsAggregation";
import type { SaleRow, ExpenseRow } from "@/features/estadisticas/services/statsAggregation";
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
} from "@/types";
import { getSaleNet } from "@/features/ventas/utils/saleAmounts";

interface StatsData {
  kpis: SalesKPIsWithDelta;
  revenueByBucket: RevenueByDay[];
  previousRevenueByBucket: RevenueByDay[];
  revenueByMethod: RevenueByPaymentMethod[];
  topProducts: TopProduct[];
  allProducts: TopProduct[];
  salesByOrderType: SalesByOrderType[];
  salesByHour: SalesByHour[];
  revenueVsExpenses: RevenueVsExpenses[];
  heatmap: HeatmapCell[];
  sparkline: number[];
  ranges: PeriodRanges;
}

const SELECT_CLAUSE =
  "id, sale_date, total_price, discount_amount, commission, order_type, payment_method, cash_amount, plin_amount, sale_products(quantity, unit_price, unit_cost, discount_amount, products(name))";

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

async function fetchStats(ranges: PeriodRanges): Promise<StatsData> {
  // Sparkline window: last 7 Lima calendar days, anchored on today (Lima).
  const todayKey = limaDateKey();
  const sparkStartKey = limaDateKey(
    new Date(new Date(`${todayKey}T05:00:00.000Z`).getTime() - 6 * 24 * 60 * 60 * 1000),
  );
  const sparkStartISO = limaDayRangeISO(sparkStartKey).start;
  const sparkEndISO = limaDayRangeISO(todayKey).end;

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
  const revenueByMethod: RevenueByPaymentMethod[] = aggregateRevenueByMethod(currentSales);

  // Top products (net-of-commission, proportional distribution)
  const allProducts = aggregateTopProducts(currentSales);
  const topProducts = allProducts.slice(0, 10);

  // Sales by order type
  const salesByOrderType: SalesByOrderType[] = aggregateSalesByOrderType(currentSales);

  // Sales by hour (Lima-aware)
  const salesByHour: SalesByHour[] = aggregateSalesByHour(currentSales);

  // Heatmap day-of-week × hour (Lima-aware)
  const heatmap: HeatmapCell[] = aggregateHeatmap(currentSales);

  // Revenue vs expenses (Lima date keys — Bug 3 fix)
  const revenueVsExpenses: RevenueVsExpenses[] = aggregateRevenueVsExpenses(
    currentSales,
    expenses,
  );

  // Sparkline: last 7 Lima days revenue
  const sparkMap = new Map<string, number>();
  for (const s of sparkSales) {
    const d = limaDateKey(s.sale_date);
    sparkMap.set(d, (sparkMap.get(d) || 0) + getSaleNet(s));
  }
  const sparkline: number[] = [];
  const todayMidnightUTC = new Date(`${todayKey}T05:00:00.000Z`).getTime();
  for (let i = 6; i >= 0; i--) {
    const key = limaDateKey(new Date(todayMidnightUTC - i * 24 * 60 * 60 * 1000));
    sparkline.push(sparkMap.get(key) || 0);
  }

  return {
    kpis,
    revenueByBucket,
    previousRevenueByBucket,
    revenueByMethod,
    topProducts,
    allProducts,
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
    allProducts: data?.allProducts ?? [],
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

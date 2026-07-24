/**
 * Pure aggregation functions for useSalesStats.
 * No React, no hooks, no I/O — only takes rows and returns computed structures.
 * All time bucketing uses America/Lima helpers to stay consistent with the
 * sales-by-hour and heatmap aggregations (F7 fix extended to revenueByBucket
 * and revenueVsExpenses).
 */

import {
  limaDateKey,
  hourInLima,
  dayInLima,
} from "@/utils/helpers/dateFormatters";
import { getSaleNet, getSaleCommission } from "@/features/ventas/utils/saleAmounts";
import type {
  KPIValue,
  TopProduct,
  RevenueByDay,
  SalesByHour,
  HeatmapCell,
  RevenueVsExpenses,
  Granularity,
} from "@/types";

// ---------------------------------------------------------------------------
// Row shapes (re-exported so consumers can type-check fixtures)
// ---------------------------------------------------------------------------

export interface SaleRow {
  id: number;
  sale_date: string;
  total_price: number;
  discount_amount: number | null;
  commission: number | null;
  order_type: string;
  payment_method: string | null;
  cash_amount: number | null;
  plin_amount: number | null;
  sale_products: Array<{
    quantity: number;
    unit_price: number;
    unit_cost: number | null;
    discount_amount: number | null;
    products: { name: string } | null;
  }>;
}

export interface ExpenseRow {
  amount: number;
  type: string;
  created_at: string;
}

export interface BaseAggregates {
  revenue: number;
  totalSales: number;
  productsSold: number;
  grossCost: number;
}

// ---------------------------------------------------------------------------
// KPI helpers
// ---------------------------------------------------------------------------

export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function toKPIValue(current: number, previous: number): KPIValue {
  return { current, previous, deltaPct: computeDelta(current, previous) };
}

// ---------------------------------------------------------------------------
// Aggregation: base KPIs
// ---------------------------------------------------------------------------

export function aggregateBase(sales: SaleRow[]): BaseAggregates {
  let revenue = 0;
  let productsSold = 0;
  let grossCost = 0;
  for (const s of sales) {
    revenue += getSaleNet(s);
    for (const sp of s.sale_products) {
      const qty = Number(sp.quantity) || 0;
      productsSold += qty;
      // Frozen snapshot cost at the time of sale — not the current product cost.
      const cost = Number(sp.unit_cost ?? 0) || 0;
      grossCost += qty * cost;
    }
  }
  return { revenue, productsSold, grossCost, totalSales: sales.length };
}

// ---------------------------------------------------------------------------
// Bucketing — Lima-aware (Bug 1 fix)
// ---------------------------------------------------------------------------

/**
 * Returns the bucket key for a sale timestamp, computed in America/Lima time.
 *
 * Previously `bucketKey` used `new Date(dateStr).getHours()` and
 * `getMonth()/getFullYear()` which are browser-local and diverge from the
 * Lima-aware helpers used in salesByHour and heatmap.  Fixed: all paths now
 * go through `limaDateKey` / `hourInLima` so every chart shares the same TZ.
 */
export function bucketKey(dateStr: string, granularity: Granularity): string {
  if (granularity === "hour") {
    const dayKey = limaDateKey(dateStr);
    const h = hourInLima(dateStr);
    return `${dayKey}T${String(h).padStart(2, "0")}`;
  }
  if (granularity === "month") {
    const dayKey = limaDateKey(dateStr); // "YYYY-MM-DD"
    return dayKey.slice(0, 7);           // "YYYY-MM"
  }
  // "day" — plain Lima date key
  return limaDateKey(dateStr);
}

// ---------------------------------------------------------------------------
// Aggregation: revenue by time bucket
// ---------------------------------------------------------------------------

export function groupRevenueByBucket(
  sales: SaleRow[],
  granularity: Granularity,
): RevenueByDay[] {
  const map = new Map<string, number>();
  for (const s of sales) {
    const key = bucketKey(s.sale_date, granularity);
    map.set(key, (map.get(key) || 0) + getSaleNet(s));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

// ---------------------------------------------------------------------------
// Aggregation: top products — net-of-commission basis (Bug 2 fix)
//
// Strategy: distribute the sale-level commission proportionally to each line
// based on its gross share of the sale total.  This guarantees that
// sum(product.totalRevenue for all products in a sale) == getSaleNet(sale),
// so the Top Products chart reconciles with the Revenue KPI.
//
// Gross line amount = qty * unit_price - line_discount_amount (no commission).
// Commission share  = commission * (lineGross / saleGross) if saleGross > 0.
// Net line amount   = lineGross - commissionShare.
//
// When a sale has no products or saleGross == 0, we leave those lines as-is
// (there is nothing to distribute and the sale net is already 0).
// ---------------------------------------------------------------------------

export function aggregateTopProducts(sales: SaleRow[]): TopProduct[] {
  const productMap: Record<string, { revenue: number; quantity: number }> = {};

  for (const s of sales) {
    const commission = getSaleCommission(s);

    // Compute sale-level gross: sum of line grosses.
    // Line gross = qty * unit_price - line_discount (mirrors previous behavior).
    let saleLineGross = 0;
    const lineGrosses: number[] = [];
    for (const sp of s.sale_products) {
      const lg =
        Number(sp.quantity) * Number(sp.unit_price) - Number(sp.discount_amount ?? 0);
      lineGrosses.push(lg);
      saleLineGross += lg;
    }

    for (let i = 0; i < s.sale_products.length; i++) {
      const sp = s.sale_products[i];
      const name = sp.products?.name ?? "Desconocido";
      if (!productMap[name]) productMap[name] = { revenue: 0, quantity: 0 };

      const lineGross = lineGrosses[i];
      // Distribute commission proportionally; avoid division by zero.
      const commissionShare =
        saleLineGross > 0 ? commission * (lineGross / saleLineGross) : 0;
      const lineNet = lineGross - commissionShare;

      productMap[name].revenue += lineNet;
      productMap[name].quantity += Number(sp.quantity);
    }
  }

  return Object.entries(productMap)
    .map(([productName, { revenue, quantity }]) => ({
      productName,
      totalRevenue: revenue,
      quantitySold: quantity,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ---------------------------------------------------------------------------
// Aggregation: revenue vs expenses — Lima date keys (Bug 3 fix)
//
// Previously used toLocalDateKey (browser-local) for both sale_date and
// created_at, causing a sale and same-day expense to land on different keys
// near midnight when browser TZ != Lima.  Fixed: both use limaDateKey.
// ---------------------------------------------------------------------------

export function aggregateRevenueVsExpenses(
  sales: SaleRow[],
  expenses: ExpenseRow[],
): RevenueVsExpenses[] {
  const expByDayMap: Record<string, number> = {};
  for (const e of expenses) {
    const date = limaDateKey(e.created_at);
    expByDayMap[date] = (expByDayMap[date] || 0) + Math.abs(Number(e.amount) || 0);
  }

  const revDayMap: Record<string, number> = {};
  for (const s of sales) {
    const date = limaDateKey(s.sale_date);
    revDayMap[date] = (revDayMap[date] || 0) + getSaleNet(s);
  }

  const allDates = new Set([...Object.keys(revDayMap), ...Object.keys(expByDayMap)]);
  return Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      revenue: revDayMap[date] || 0,
      expenses: expByDayMap[date] || 0,
    }));
}

// ---------------------------------------------------------------------------
// Aggregation: sales by hour (Lima-aware)
// ---------------------------------------------------------------------------

export function aggregateSalesByHour(sales: SaleRow[]): SalesByHour[] {
  const hourMap: Record<number, { count: number; revenue: number }> = {};
  for (const s of sales) {
    const hour = hourInLima(s.sale_date);
    if (!hourMap[hour]) hourMap[hour] = { count: 0, revenue: 0 };
    hourMap[hour].count++;
    hourMap[hour].revenue += getSaleNet(s);
  }
  return Object.entries(hourMap)
    .map(([h, { count, revenue }]) => ({ hour: parseInt(h), count, revenue }))
    .sort((a, b) => a.hour - b.hour);
}

// ---------------------------------------------------------------------------
// Aggregation: revenue by payment method
// ---------------------------------------------------------------------------

export function aggregateRevenueByMethod(
  sales: SaleRow[],
): Array<{ method: string; total: number }> {
  const map: Record<string, number> = {};
  for (const s of sales) {
    const method = s.payment_method ?? "Otro";
    map[method] = (map[method] || 0) + getSaleNet(s);
  }
  return Object.entries(map).map(([method, total]) => ({ method, total }));
}

// ---------------------------------------------------------------------------
// Aggregation: sales by order type
// ---------------------------------------------------------------------------

export function aggregateSalesByOrderType(
  sales: SaleRow[],
): Array<{ orderType: string; count: number; revenue: number }> {
  const map: Record<string, { count: number; revenue: number }> = {};
  for (const s of sales) {
    if (!map[s.order_type]) map[s.order_type] = { count: 0, revenue: 0 };
    map[s.order_type].count++;
    map[s.order_type].revenue += getSaleNet(s);
  }
  return Object.entries(map).map(([orderType, { count, revenue }]) => ({
    orderType,
    count,
    revenue,
  }));
}

// ---------------------------------------------------------------------------
// Aggregation: heatmap (Lima-aware dow × hour)
// ---------------------------------------------------------------------------

export function aggregateHeatmap(sales: SaleRow[]): HeatmapCell[] {
  const heatmapMap = new Map<string, { count: number; revenue: number }>();
  for (const s of sales) {
    const dow = dayInLima(s.sale_date);
    const hour = hourInLima(s.sale_date);
    const key = `${dow}-${hour}`;
    const prev = heatmapMap.get(key) ?? { count: 0, revenue: 0 };
    heatmapMap.set(key, {
      count: prev.count + 1,
      revenue: prev.revenue + getSaleNet(s),
    });
  }
  return Array.from(heatmapMap.entries()).map(([k, v]) => {
    const [dow, hour] = k.split("-").map(Number);
    return { dayOfWeek: dow, hour, count: v.count, revenue: v.revenue };
  });
}

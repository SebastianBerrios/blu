export interface SalesKPIs {
  revenue: number;
  avgTicket: number;
  productsSold: number;
  totalSales: number;
  grossMargin: number;
  grossMarginPct: number;
}

export interface SalesKPIsWithDelta {
  revenue: KPIValue;
  avgTicket: KPIValue;
  productsSold: KPIValue;
  totalSales: KPIValue;
  grossMargin: KPIValue;
  grossMarginPct: KPIValue;
}

export interface KPIValue {
  current: number;
  previous: number;
  deltaPct: number | null;
}

export interface RevenueByDay {
  date: string;
  revenue: number;
}

export interface RevenueByPaymentMethod {
  method: string;
  total: number;
}

export interface TopProduct {
  productName: string;
  totalRevenue: number;
  quantitySold: number;
}

export interface SalesByOrderType {
  orderType: string;
  count: number;
  revenue: number;
}

export interface SalesByHour {
  hour: number;
  count: number;
  revenue: number;
}

export interface RevenueVsExpenses {
  date: string;
  revenue: number;
  expenses: number;
}

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
  revenue: number;
}

export type DateRangePreset = "today" | "week" | "month" | "year" | "custom";

export type Granularity = "hour" | "day" | "month";

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

export interface PeriodRanges {
  preset: DateRangePreset;
  current: { start: string; end: string };
  previous: { start: string; end: string };
  granularity: Granularity;
  label: string;
  previousLabel: string;
}

export interface SalesKPIs {
  dailyRevenue: number;
  monthlyRevenue: number;
  avgTicket: number;
  productsSold: number;
  totalSales: number;
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

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

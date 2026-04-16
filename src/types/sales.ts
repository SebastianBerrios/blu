import type { Tables } from "./database";

export type Sale = Tables<"sales">;
export type SaleProduct = Tables<"sale_products">;
export type PaymentMethod = "Efectivo" | "Yape" | "Efectivo + Yape";
export type SaleProductStatus = "Pendiente" | "Entregado";

export interface SaleProductWithDetails {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name: string;
  status: SaleProductStatus;
  temperatura: string | null;
  tipo_leche: string | null;
  loyalty_reward: string | null;
}

export interface SaleWithProducts extends Sale {
  sale_products: SaleProductWithDetails[];
  customer_dni?: number | null;
  creator_name?: string | null;
}

export interface SalesGroupedByDate {
  date: string;
  dailyTotal: number;
  sales: SaleWithProducts[];
}

export interface CreateSale {
  orderType: string;
  customerId?: number;
  products: {
    productId: number;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface SaleSummary {
  id: number;
  customerDNI: string | null;
  date: string;
  total: number;
  itemCount: number;
  orderType: string;
}

export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  customerId?: number;
  customerDNI?: number;
  orderType?: string;
  minAmount?: number;
  maxAmount?: number;
}

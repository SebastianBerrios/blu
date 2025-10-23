import type { Tables } from "./database";

export type Sale = Tables<"sales">;
export type SaleProduct = Tables<"sale_products">;

export interface CreateSale {
  customerId?: number;
  customerDNI?: string;
  orderType: "mesa" | "llevar" | "delivery";
  products: {
    productId: number;
    quantity: number;
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

// Tipos para filtros y búsqueda
export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  customerId?: number;
  customerDNI?: number;
  orderType?: string;
  minAmount?: number;
  maxAmount?: number;
}

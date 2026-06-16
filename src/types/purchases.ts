import type { Tables } from "./database";
import type { AccountType } from "./finance";

export type Purchase = Tables<"purchases">;
export type PurchaseItem = Tables<"purchase_items">;

export interface PurchaseItemWithDetails {
  id: number;
  item_name: string;
  ingredient_id: number | null;
  price: number;
  quantity: number | null;
  unit: string | null;
}

export interface PurchaseWithItems extends Purchase {
  purchase_items: PurchaseItemWithDetails[];
  purchaser_name: string | null;
  purchaser_role: string | null;
  account_type: AccountType | null;
}

export interface PurchasesGroupedByDate {
  date: string;
  dailyTotal: number;
  purchases: PurchaseWithItems[];
}

export interface PurchaseItemLine {
  item_name: string;
  ingredient_id: number | null;
  price: number;
  /** Cantidad comprada (en la unidad `unit`). Suma al inventario tras convertir a la unidad de stock. */
  quantity?: number | null;
  /** Unidad en que se ingresó la cantidad (null = unidad de stock del ingrediente). */
  unit?: string | null;
}

export interface PurchasesFilters {
  startDate?: string;
  endDate?: string;
}

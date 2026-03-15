import type { Tables } from "./database";

export type Purchase = Tables<"purchases">;
export type PurchaseItem = Tables<"purchase_items">;

export interface PurchaseItemWithDetails {
  id: number;
  item_name: string;
  ingredient_id: number | null;
  price: number;
}

export interface PurchaseWithItems extends Purchase {
  purchase_items: PurchaseItemWithDetails[];
  purchaser_name: string | null;
  purchaser_role: string | null;
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
}

import type { Tables } from "./database";

export type Account = Tables<"accounts">;
export type Transaction = Tables<"transactions">;
export type TransactionCategory = Tables<"transaction_categories">;

export type AccountType = "caja" | "banco" | "rappi" | "pos";
export type TransactionType =
  | "ingreso_venta"
  | "egreso_compra"
  | "transferencia_in"
  | "transferencia_out"
  | "gasto"
  | "ingreso_extra"
  | "ajuste";

export type TransactionCategoryKind = "ingreso" | "egreso";

export interface CreateTransactionCategory {
  name: string;
  kind: TransactionCategoryKind;
}

export interface TransactionWithUser extends Transaction {
  user_name: string | null;
  category_name: string | null;
}

export interface TransactionFilters {
  accountId?: number;
  type?: TransactionType;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
}

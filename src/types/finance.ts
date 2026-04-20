import type { Tables } from "./database";

export type Account = Tables<"accounts">;
export type Transaction = Tables<"transactions">;

export type AccountType = "caja" | "banco" | "rappi";
export type TransactionType =
  | "ingreso_venta"
  | "egreso_compra"
  | "transferencia_in"
  | "transferencia_out"
  | "gasto"
  | "ingreso_extra";

export interface TransactionWithUser extends Transaction {
  user_name: string | null;
}

export interface TransactionFilters {
  accountId?: number;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

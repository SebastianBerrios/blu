import type { PurchaseItemLine } from "@/types";

export interface CreatePurchaseParams {
  items: PurchaseItemLine[];
  hasDelivery: boolean;
  deliveryCost: number;
  total: number;
  notes: string;
  selectedAccountId: number;
  yapeChangeAmount: number;
  // Context
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  userId: string | null;
  userName: string | null;
}

export interface UpdatePurchaseParams {
  purchaseId: number;
  items: PurchaseItemLine[];
  hasDelivery: boolean;
  deliveryCost: number;
  total: number;
  notes: string;
  selectedAccountId: number;
}

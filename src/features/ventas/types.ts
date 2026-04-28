import type { PaymentMethod } from "@/types";

export type LoyaltyReward = "50_postre" | "bebida_gratis";

export interface SaleProductLine {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  temperatura: string | null;
  tipo_leche: string | null;
  category_id: number | null;
  loyalty_reward?: LoyaltyReward | null;
}

export interface SaleSubmitParams {
  orderType: string;
  tableNumber: string;
  customerDni: string;
  saleProducts: SaleProductLine[];
  totalPrice: number;
  registerPayment: boolean;
  paymentMethod: PaymentMethod;
  cashAmount: string;
  plinAmount: string;
  cashReceived: string;
  notes: string;
  userId: string | null;
  userName: string | null;
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  rappiAccountId: number | null;
  existingPaymentDate?: string | null;
}

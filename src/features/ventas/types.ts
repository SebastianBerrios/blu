import type { PaymentMethod, SaleProductStatus } from "@/types";

export type LoyaltyReward = "50_postre" | "bebida_gratis";

export type DiscountMode = "monto" | "porcentaje";

export interface SaleProductLine {
  id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  temperatura: string | null;
  tipo_leche: string | null;
  category_id: number | null;
  loyalty_reward?: LoyaltyReward | null;
  status?: SaleProductStatus;
  // Descuento por línea (solo admin). `discount_mode`/`discount_value` son del
  // formulario; `discount_amount` es el monto resuelto (S/) que se persiste.
  discount_mode?: DiscountMode;
  discount_value?: number;
  discount_amount?: number;
}

export interface SaleSubmitParams {
  orderType: string;
  tableNumber: string;
  customerDni: string;
  saleProducts: SaleProductLine[];
  totalPrice: number;
  discountAmount: number;
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

import type { PaymentMethod } from "@/types";

export interface SaleProductLine {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  temperatura: string | null;
  tipo_leche: string | null;
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
  yapeAmount: string;
  userId: string | null;
  userName: string | null;
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  existingPaymentDate?: string | null;
}

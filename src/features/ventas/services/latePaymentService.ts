import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { PaymentMethod } from "@/types";
import type { SaleProductLine } from "../types";
import { RAPPI_COMMISSION_RATE } from "../constants";
import { buildPaymentAmounts, resolveCashReceived } from "./paymentHelpers";
import { buildSalePayments } from "./salesService";

export interface RegisterPaymentWithRewardsParams {
  saleId: number;
  saleProducts: SaleProductLine[];
  newTotalPrice: number;
  paymentMethod: PaymentMethod;
  cashAmount: string;
  plinAmount: string;
  cashReceived: string;
  userId: string | null;
  userName: string | null;
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  rappiAccountId: number | null;
}

export async function registerPaymentWithRewards(
  params: RegisterPaymentWithRewardsParams
): Promise<void> {
  const {
    saleId,
    saleProducts,
    newTotalPrice,
    paymentMethod,
    cashAmount,
    plinAmount,
    cashReceived,
    userId,
    userName,
    cajaAccountId,
    bancoAccountId,
    rappiAccountId,
  } = params;

  if (newTotalPrice <= 0) {
    throw new Error("El total de la venta debe ser mayor a 0");
  }

  const { cash, plin } = buildPaymentAmounts(
    paymentMethod,
    newTotalPrice,
    cashAmount,
    plinAmount
  );
  const cash_received = resolveCashReceived(cash, cashReceived);

  const supabase = createClient();
  const saleNumber = await getSaleNumber(saleId);

  const commission =
    paymentMethod === "Rappi"
      ? Number((newTotalPrice * RAPPI_COMMISSION_RATE).toFixed(2))
      : null;

  const payments = buildSalePayments({
    saleNumber,
    paymentMethod,
    totalPrice: newTotalPrice,
    commission,
    cashAmount: cash,
    plinAmount: plin,
    cajaAccountId,
    bancoAccountId,
    rappiAccountId,
  });

  const productsPayload = saleProducts.map((p) => ({
    product_id: p.product_id,
    quantity: p.quantity,
    unit_price: p.unit_price,
    temperatura: p.temperatura ?? "",
    tipo_leche: p.tipo_leche ?? "",
    loyalty_reward: p.loyalty_reward ?? "",
  }));

  const { error } = await supabase.rpc("register_late_payment", {
    p_sale_id: saleId,
    p_total_price: newTotalPrice,
    p_payment_method: paymentMethod,
    p_cash_amount: cash,
    p_plin_amount: plin,
    p_cash_received: cash_received,
    p_products: productsPayload,
    p_payments: payments,
  });

  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "crear_transaccion",
    targetTable: "transactions",
    targetDescription: `Pago venta #${saleNumber} - ${paymentMethod} - S/ ${newTotalPrice.toFixed(2)}`,
    details: {
      venta_id: saleId,
      metodo: paymentMethod,
      total: newTotalPrice,
      cash_received,
    },
  });
}

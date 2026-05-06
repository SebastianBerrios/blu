import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { PaymentMethod } from "@/types";
import type { SaleProductLine } from "../types";
import { RAPPI_COMMISSION_RATE } from "../constants";
import { buildPaymentAmounts, resolveCashReceived } from "./paymentHelpers";
import { recordSaleTransactions } from "./salesService";

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

  const { cash, plin } = buildPaymentAmounts(
    paymentMethod,
    newTotalPrice,
    cashAmount,
    plinAmount
  );
  const cash_received = resolveCashReceived(cash, cashReceived);

  if (newTotalPrice <= 0) {
    throw new Error("El total de la venta debe ser mayor a 0");
  }

  const supabase = createClient();

  const { error: saleError } = await supabase
    .from("sales")
    .update({
      total_price: newTotalPrice,
      payment_method: paymentMethod,
      payment_date: new Date().toISOString(),
      cash_amount: cash,
      plin_amount: plin,
      cash_received,
    })
    .eq("id", saleId);

  if (saleError) throw saleError;

  await supabase.from("sale_products").delete().eq("sale_id", saleId);

  const { error: productsError } = await supabase
    .from("sale_products")
    .insert(
      saleProducts.map((p) => ({
        sale_id: saleId,
        product_id: p.product_id,
        quantity: p.quantity,
        unit_price: p.unit_price,
        temperatura: p.temperatura,
        tipo_leche: p.tipo_leche,
        loyalty_reward: p.loyalty_reward ?? null,
      }))
    );

  if (productsError) throw productsError;

  const saleNumber = await getSaleNumber(saleId);

  const commission =
    paymentMethod === "Rappi"
      ? Number((newTotalPrice * RAPPI_COMMISSION_RATE).toFixed(2))
      : null;

  // recordSaleTransactions ahora usa replace_sale_transactions (atómica),
  // que revierte cualquier transacción previa y registra las nuevas.
  await recordSaleTransactions({
    saleId,
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

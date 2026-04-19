import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { PaymentMethod } from "@/types";
import type { SaleProductLine } from "../types";
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
  } = params;

  const { cash, plin } = buildPaymentAmounts(
    paymentMethod,
    newTotalPrice,
    cashAmount,
    plinAmount
  );
  const cash_received = resolveCashReceived(cash, cashReceived);

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

  // Defensively clear any pre-existing transactions for this sale before
  // creating new ones. This keeps sales <-> transactions in sync even if
  // this function is ever invoked on an already-paid sale.
  const { error: deleteError } = await supabase.rpc("delete_sale_transactions", {
    p_sale_id: saleId,
  });
  if (deleteError) throw deleteError;

  const saleNumber = await getSaleNumber(saleId);

  await recordSaleTransactions({
    saleId,
    saleNumber,
    cashAmount: cash,
    plinAmount: plin,
    cajaAccountId,
    bancoAccountId,
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

import { createClient } from "@/utils/supabase/client";
import { recordTransaction } from "@/hooks/useTransactions";
import { logAudit } from "@/utils/auditLog";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { getSaleNumber } from "@/utils/saleNumber";
import type { SaleSubmitParams } from "../types";
import {
  buildPaymentFields,
  validateSplitPayment,
  validateCashReceived,
  paymentStateChanged,
} from "./paymentHelpers";

async function resolveCustomerId(dni: string): Promise<number | null> {
  if (!dni.trim()) return null;

  const supabase = createClient();
  const dniNumber = parseInt(dni.trim());

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("dni", dniNumber)
    .single();

  if (existing) return existing.id;

  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({ dni: dniNumber })
    .select("id")
    .single();

  if (error) throw error;
  return newCustomer.id;
}

function buildSaleProductRows(saleId: number, params: SaleSubmitParams) {
  return params.saleProducts.map((p) => ({
    sale_id: saleId,
    product_id: p.product_id,
    quantity: p.quantity,
    unit_price: p.unit_price,
    temperatura: p.temperatura,
    tipo_leche: p.tipo_leche,
    loyalty_reward: p.loyalty_reward ?? null,
  }));
}

export async function recordSaleTransactions(params: {
  saleId: number;
  saleNumber: number;
  cashAmount: number | null;
  plinAmount: number | null;
  cajaAccountId: number | null;
  bancoAccountId: number | null;
}): Promise<void> {
  const { saleId, saleNumber, cashAmount, plinAmount, cajaAccountId, bancoAccountId } = params;

  if (cashAmount && cashAmount > 0 && cajaAccountId) {
    await recordTransaction({
      accountId: cajaAccountId,
      type: "ingreso_venta",
      amount: cashAmount,
      description: `Venta #${saleNumber} - Efectivo`,
      referenceId: saleId,
      referenceType: "sale",
    });
  }
  if (plinAmount && plinAmount > 0 && bancoAccountId) {
    await recordTransaction({
      accountId: bancoAccountId,
      type: "ingreso_venta",
      amount: plinAmount,
      description: `Venta #${saleNumber} - Plin`,
      referenceId: saleId,
      referenceType: "sale",
    });
  }
}

export async function createSale(params: SaleSubmitParams): Promise<void> {
  validateSplitPayment(params);

  const supabase = createClient();
  const customerId = await resolveCustomerId(params.customerDni);
  const paymentFields = buildPaymentFields(params);
  validateCashReceived(paymentFields);

  const { data: newSale, error } = await supabase
    .from("sales")
    .insert({
      order_type: params.orderType,
      total_price: params.totalPrice,
      customer_id: customerId,
      table_number:
        params.orderType === "Mesa"
          ? parseInt(params.tableNumber) || null
          : null,
      user_id: params.userId,
      ...paymentFields,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: productsError } = await supabase
    .from("sale_products")
    .insert(buildSaleProductRows(newSale.id, params));

  if (productsError) throw productsError;

  const saleNumber = await getSaleNumber(newSale.id);

  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "crear_venta",
    targetTable: "sales",
    targetId: newSale.id,
    targetDescription: `Venta #${saleNumber} - ${params.orderType} - S/ ${params.totalPrice.toFixed(2)}`,
    details: {
      tipo_pedido: params.orderType,
      total: params.totalPrice,
      productos: params.saleProducts.length,
      pago_registrado: params.registerPayment,
      cash_received: paymentFields.cash_received,
    },
  });

  if (params.registerPayment) {
    await recordSaleTransactions({
      saleId: newSale.id,
      saleNumber,
      cashAmount: paymentFields.cash_amount,
      plinAmount: paymentFields.plin_amount,
      cajaAccountId: params.cajaAccountId,
      bancoAccountId: params.bancoAccountId,
    });

    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "crear_transaccion",
      targetTable: "transactions",
      targetDescription: `Venta #${saleNumber} - ${params.paymentMethod} - S/ ${params.totalPrice.toFixed(2)}`,
      details: {
        venta_id: newSale.id,
        metodo: params.paymentMethod,
        total: params.totalPrice,
      },
    });
  }
}

export async function updateSale(
  saleId: number,
  params: SaleSubmitParams
): Promise<void> {
  validateSplitPayment(params);

  const supabase = createClient();
  const customerId = await resolveCustomerId(params.customerDni);
  const paymentFields = buildPaymentFields(params);
  validateCashReceived(paymentFields);

  // Fetch existing payment state to detect changes for transaction re-sync
  const { data: existingSale, error: fetchError } = await supabase
    .from("sales")
    .select("payment_method, cash_amount, plin_amount")
    .eq("id", saleId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("sales")
    .update({
      order_type: params.orderType,
      total_price: params.totalPrice,
      customer_id: customerId,
      table_number:
        params.orderType === "Mesa"
          ? parseInt(params.tableNumber) || null
          : null,
      ...paymentFields,
    })
    .eq("id", saleId);

  if (error) throw error;

  await supabase.from("sale_products").delete().eq("sale_id", saleId);

  const { error: productsError } = await supabase
    .from("sale_products")
    .insert(buildSaleProductRows(saleId, params));

  if (productsError) throw productsError;

  // Re-sync transactions if payment state changed
  const changed = paymentStateChanged(existingSale, paymentFields);
  if (changed) {
    const { error: deleteError } = await supabase.rpc("delete_sale_transactions", {
      p_sale_id: saleId,
    });
    if (deleteError) throw deleteError;

    if (paymentFields.payment_method) {
      const saleNumber = await getSaleNumber(saleId);
      await recordSaleTransactions({
        saleId,
        saleNumber,
        cashAmount: paymentFields.cash_amount,
        plinAmount: paymentFields.plin_amount,
        cajaAccountId: params.cajaAccountId,
        bancoAccountId: params.bancoAccountId,
      });

      logAudit({
        userId: params.userId,
        userName: params.userName,
        action: "actualizar",
        targetTable: "sales",
        targetId: saleId,
        targetDescription: `Venta #${saleNumber} - ${paymentFields.payment_method} - S/ ${params.totalPrice.toFixed(2)}`,
        details: {
          transacciones_regeneradas: true,
          metodo_anterior: existingSale.payment_method,
          metodo_nuevo: paymentFields.payment_method,
          cash_amount: paymentFields.cash_amount,
          plin_amount: paymentFields.plin_amount,
          cash_received: paymentFields.cash_received,
        },
      });
    } else {
      const saleNumber = await getSaleNumber(saleId);
      logAudit({
        userId: params.userId,
        userName: params.userName,
        action: "actualizar",
        targetTable: "sales",
        targetId: saleId,
        targetDescription: `Venta #${saleNumber} - Pago removido`,
        details: {
          transacciones_regeneradas: true,
          metodo_anterior: existingSale.payment_method,
          metodo_nuevo: null,
        },
      });
    }
  }
}

export async function deleteSale(
  saleId: number,
  userId: string | null,
  userName: string | null
): Promise<void> {
  const saleNumber = await getSaleNumber(saleId);
  const supabase = createClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("total_price")
    .eq("id", saleId)
    .single();

  await deleteWithAudit({
    table: "sales",
    id: saleId,
    userId,
    userName,
    auditTable: "sales",
    description: `Venta #${saleNumber} - S/ ${sale?.total_price?.toFixed(2) ?? "?"}`,
  });
}

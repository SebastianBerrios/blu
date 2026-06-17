import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { SaleSubmitParams } from "../types";
import { RAPPI_COMMISSION_RATE, POS_COMMISSION_RATE } from "../constants";
import { resolveLineDiscount, round2 } from "../utils/discount";
import {
  buildPaymentFields,
  validateSplitPayment,
  validateCashReceived,
  paymentStateChanged,
} from "./paymentHelpers";

interface SalePayment {
  account_id: number;
  type: string;
  amount: number;
  description: string;
}

export function computeCommission(
  orderType: string,
  totalPrice: number,
  discountAmount = 0,
  paymentMethod?: string | null,
): number | null {
  // La comisión se calcula sobre el monto rebajado por descuento (neto a cobrar).
  const base = Math.max(0, totalPrice - (discountAmount || 0));
  // Rappi está acoplado al tipo de pedido (el pedido Rappi fuerza el pago Rappi).
  if (orderType === "Rappi") {
    return Number((base * RAPPI_COMMISSION_RATE).toFixed(2));
  }
  // POS es un método de pago puro: la comisión depende del método, no del pedido.
  if (paymentMethod === "POS") {
    return Number((base * POS_COMMISSION_RATE).toFixed(2));
  }
  return null;
}

async function resolveCustomerId(dni: string): Promise<number | null> {
  if (!dni.trim()) return null;

  const supabase = createClient();
  const dniNumber = parseInt(dni.trim());

  if (Number.isNaN(dniNumber)) return null;

  const { data: existing, error: lookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("dni", dniNumber)
    .maybeSingle();
  if (lookupError) throw lookupError;

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
  return params.saleProducts
    .filter((p) => p.status !== "Entregado")
    .map((p) => ({
      sale_id: saleId,
      product_id: p.product_id,
      quantity: p.quantity,
      unit_price: p.unit_price,
      unit_cost: p.unit_cost ?? 0,
      temperatura: p.temperatura,
      tipo_leche: p.tipo_leche,
      loyalty_reward: p.loyalty_reward ?? null,
      discount_amount: resolveLineDiscount(p),
    }));
}

export function buildSalePayments(params: {
  saleNumber: number;
  paymentMethod: string | null;
  totalPrice: number;
  commission: number | null;
  cashAmount: number | null;
  plinAmount: number | null;
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  rappiAccountId: number | null;
  posAccountId: number | null;
}): SalePayment[] {
  const {
    saleNumber,
    paymentMethod,
    totalPrice,
    commission,
    cashAmount,
    plinAmount,
    cajaAccountId,
    bancoAccountId,
    rappiAccountId,
    posAccountId,
  } = params;

  if (!paymentMethod) return [];

  if (paymentMethod === "Rappi") {
    if (!rappiAccountId) throw new Error("No se encontró la cuenta Rappi");
    const net = Number((totalPrice - (commission ?? 0)).toFixed(2));
    if (net <= 0) return [];
    return [{
      account_id: rappiAccountId,
      type: "ingreso_venta",
      amount: net,
      description: `Venta #${saleNumber} - Rappi (neto)`,
    }];
  }

  if (paymentMethod === "POS") {
    if (!posAccountId) throw new Error("No se encontró la cuenta POS");
    const net = Number((totalPrice - (commission ?? 0)).toFixed(2));
    if (net <= 0) return [];
    return [{
      account_id: posAccountId,
      type: "ingreso_venta",
      amount: net,
      description: `Venta #${saleNumber} - POS (neto)`,
    }];
  }

  if ((paymentMethod === "Efectivo" || paymentMethod === "Efectivo + Plin") && !cajaAccountId) {
    throw new Error("No se encontró la cuenta Caja");
  }
  if ((paymentMethod === "Plin" || paymentMethod === "Efectivo + Plin") && !bancoAccountId) {
    throw new Error("No se encontró la cuenta Bancaria");
  }

  const payments: SalePayment[] = [];
  if (cashAmount && cashAmount > 0 && cajaAccountId) {
    payments.push({
      account_id: cajaAccountId,
      type: "ingreso_venta",
      amount: cashAmount,
      description: `Venta #${saleNumber} - Efectivo`,
    });
  }
  if (plinAmount && plinAmount > 0 && bancoAccountId) {
    payments.push({
      account_id: bancoAccountId,
      type: "ingreso_venta",
      amount: plinAmount,
      description: `Venta #${saleNumber} - Plin`,
    });
  }
  return payments;
}

export async function recordSaleTransactions(params: {
  saleId: number;
  saleNumber: number;
  paymentMethod: string | null;
  totalPrice: number;
  commission: number | null;
  cashAmount: number | null;
  plinAmount: number | null;
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  rappiAccountId: number | null;
  posAccountId: number | null;
}): Promise<void> {
  const supabase = createClient();
  const payments = buildSalePayments(params);
  const { error } = await supabase.rpc("replace_sale_transactions", {
    p_sale_id: params.saleId,
    p_payments: payments,
  });
  if (error) throw error;
}

export async function createSale(params: SaleSubmitParams): Promise<void> {
  const discountAmount = round2(
    Math.min(Math.max(params.discountAmount || 0, 0), params.totalPrice),
  );
  const netPayable = round2(params.totalPrice - discountAmount);
  if (netPayable < 0) {
    throw new Error("El total a cobrar no puede ser negativo");
  }
  // Las utilidades de pago operan sobre el neto a cobrar (total − descuento).
  const netParams = { ...params, totalPrice: netPayable };
  validateSplitPayment(netParams);

  const supabase = createClient();
  const customerId = await resolveCustomerId(params.customerDni);
  const paymentFields = buildPaymentFields(netParams);
  validateCashReceived(paymentFields);

  const commission = computeCommission(
    params.orderType,
    params.totalPrice,
    discountAmount,
    paymentFields.payment_method,
  );

  const { data: newSale, error } = await supabase
    .from("sales")
    .insert({
      order_type: params.orderType,
      total_price: params.totalPrice,
      discount_amount: discountAmount,
      commission,
      customer_id: customerId,
      table_number:
        params.orderType === "Mesa"
          ? parseInt(params.tableNumber) || null
          : null,
      notes: params.notes.trim() || null,
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
      commission,
    },
  });

  if (params.registerPayment) {
    await recordSaleTransactions({
      saleId: newSale.id,
      saleNumber,
      paymentMethod: paymentFields.payment_method,
      totalPrice: netPayable,
      commission,
      cashAmount: paymentFields.cash_amount,
      plinAmount: paymentFields.plin_amount,
      cajaAccountId: params.cajaAccountId,
      bancoAccountId: params.bancoAccountId,
      rappiAccountId: params.rappiAccountId,
      posAccountId: params.posAccountId,
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
        commission,
      },
    });
  }
}

export async function updateSale(
  saleId: number,
  params: SaleSubmitParams
): Promise<void> {
  const discountAmount = round2(
    Math.min(Math.max(params.discountAmount || 0, 0), params.totalPrice),
  );
  const netPayable = round2(params.totalPrice - discountAmount);
  if (netPayable < 0) {
    throw new Error("El total a cobrar no puede ser negativo");
  }
  const netParams = { ...params, totalPrice: netPayable };
  validateSplitPayment(netParams);

  const supabase = createClient();
  const customerId = await resolveCustomerId(params.customerDni);
  const paymentFields = buildPaymentFields(netParams);
  validateCashReceived(paymentFields);

  const commission = computeCommission(
    params.orderType,
    params.totalPrice,
    discountAmount,
    paymentFields.payment_method,
  );

  // Fetch existing payment state to detect changes for transaction re-sync
  const { data: existingSale, error: fetchError } = await supabase
    .from("sales")
    .select("payment_method, cash_amount, plin_amount, total_price, discount_amount")
    .eq("id", saleId)
    .single();

  if (fetchError) throw fetchError;

  const { data: updatedRows, error } = await supabase
    .from("sales")
    .update({
      order_type: params.orderType,
      total_price: params.totalPrice,
      discount_amount: discountAmount,
      commission,
      customer_id: customerId,
      table_number:
        params.orderType === "Mesa"
          ? parseInt(params.tableNumber) || null
          : null,
      notes: params.notes.trim() || null,
      last_edited_by: params.userId,
      last_edited_at: new Date().toISOString(),
      ...paymentFields,
    })
    .eq("id", saleId)
    .select("id");

  if (error) throw error;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      "No se pudo actualizar la venta. Solo se pueden editar ventas del día actual.",
    );
  }

  // Eliminar items "Entregado" que el admin quitó: revierte inventario y borra
  // la fila de forma atómica vía RPC (valida rol admin en el servidor).
  const { data: existingDelivered } = await supabase
    .from("sale_products")
    .select("id")
    .eq("sale_id", saleId)
    .eq("status", "Entregado");

  const keptDeliveredIds = new Set(
    params.saleProducts
      .filter((p) => p.status === "Entregado" && p.id)
      .map((p) => p.id),
  );
  const removedDeliveredIds = (existingDelivered ?? [])
    .map((r) => r.id)
    .filter((id) => !keptDeliveredIds.has(id));

  for (const spId of removedDeliveredIds) {
    const { error: rpcError } = await supabase.rpc(
      "delete_delivered_sale_product",
      {
        p_sale_product_id: spId,
        p_user_name: params.userName ?? undefined,
      },
    );
    if (rpcError) throw rpcError;

    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "eliminar",
      targetTable: "sale_products",
      targetId: spId,
      targetDescription: `Item entregado eliminado de venta #${saleId}`,
    });
  }

  const { error: deleteError } = await supabase
    .from("sale_products")
    .delete()
    .eq("sale_id", saleId)
    .eq("status", "Pendiente");
  if (deleteError) throw deleteError;

  const rowsToInsert = buildSaleProductRows(saleId, params);
  if (rowsToInsert.length > 0) {
    const { error: productsError } = await supabase
      .from("sale_products")
      .insert(rowsToInsert);
    if (productsError) throw productsError;
  }

  // Re-sync transactions whenever the sale has an active payment, OR when a
  // payment is being removed (existingSale had one, new state has none).
  // replace_sale_transactions is idempotent (revert + insert) so this is safe
  // and acts as auto-recovery for sales that were left orphaned by a prior
  // partial failure (payment_method set in DB but no transactions).
  // Neto anterior vs nuevo: detecta cambios de monto (incl. solo descuento) que
  // requieren regenerar transacciones aunque el método de pago no cambie.
  const existingNet = round2(
    Number(existingSale.total_price ?? 0) - Number(existingSale.discount_amount ?? 0),
  );
  const netAmountChanged = Math.abs(existingNet - netPayable) > 0.01;
  const paymentChanged =
    paymentStateChanged(existingSale, paymentFields) || netAmountChanged;
  const hasActivePayment = paymentFields.payment_method !== null;
  const paymentRemoved =
    !hasActivePayment && existingSale.payment_method !== null;

  if (hasActivePayment || paymentRemoved) {
    const saleNumber = await getSaleNumber(saleId);
    await recordSaleTransactions({
      saleId,
      saleNumber,
      paymentMethod: paymentFields.payment_method,
      totalPrice: netPayable,
      commission,
      cashAmount: paymentFields.cash_amount,
      plinAmount: paymentFields.plin_amount,
      cajaAccountId: params.cajaAccountId,
      bancoAccountId: params.bancoAccountId,
      rappiAccountId: params.rappiAccountId,
      posAccountId: params.posAccountId,
    });

    if (paymentChanged || paymentRemoved) {
      logAudit({
        userId: params.userId,
        userName: params.userName,
        action: "actualizar",
        targetTable: "sales",
        targetId: saleId,
        targetDescription: paymentFields.payment_method
          ? `Venta #${saleNumber} - ${paymentFields.payment_method} - S/ ${params.totalPrice.toFixed(2)}`
          : `Venta #${saleNumber} - Pago removido`,
        details: {
          transacciones_regeneradas: true,
          metodo_anterior: existingSale.payment_method,
          metodo_nuevo: paymentFields.payment_method,
          cash_amount: paymentFields.cash_amount,
          plin_amount: paymentFields.plin_amount,
          cash_received: paymentFields.cash_received,
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

  const { error } = await supabase.rpc("delete_sale_atomic", {
    p_sale_id: saleId,
    p_user_name: userName ?? undefined,
  });
  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "eliminar",
    targetTable: "sales",
    targetId: saleId,
    targetDescription: `Venta #${saleNumber} - S/ ${sale?.total_price?.toFixed(2) ?? "?"}`,
  });
}

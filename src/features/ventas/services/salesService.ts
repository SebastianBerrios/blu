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
  // --- Client-side UX pre-validation (fast-fail before network round-trip) ---
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
  const paymentFields = buildPaymentFields(netParams);
  validateCashReceived(paymentFields);

  // Pre-compute commission for the payment entries passed to the RPC.
  // The RPC recomputes server-side and is authoritative; this is for UX only.
  const commission = computeCommission(
    params.orderType,
    params.totalPrice,
    discountAmount,
    paymentFields.payment_method,
  );

  // Build payment_entries array (same shape as buildSalePayments) so the RPC
  // can call replace_sale_transactions without re-deriving the split logic.
  // Documented sync pair: buildSalePayments ↔ create_sale_atomic payment block.
  const saleNumberForDesc = 0; // placeholder — RPC will use the real id
  const paymentEntries = params.registerPayment
    ? buildSalePayments({
        saleNumber: saleNumberForDesc,
        paymentMethod: paymentFields.payment_method,
        totalPrice: netPayable,
        commission,
        cashAmount: paymentFields.cash_amount,
        plinAmount: paymentFields.plin_amount,
        cajaAccountId: params.cajaAccountId,
        bancoAccountId: params.bancoAccountId,
        rappiAccountId: params.rappiAccountId,
        posAccountId: params.posAccountId,
      })
    : [];

  // --- Build the atomic payload ---
  const payload = {
    header: {
      order_type: params.orderType,
      table_number: params.orderType === "Mesa" ? parseInt(params.tableNumber) || null : null,
      notes: params.notes.trim() || null,
      customer_dni: params.customerDni || null,
      user_id: params.userId,
      total_price: params.totalPrice,
      discount_amount: discountAmount,
      register_payment: params.registerPayment,
    },
    products: buildSaleProductRows(0, params).map((row) => ({
      product_id: row.product_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      unit_cost: row.unit_cost,
      temperatura: row.temperatura,
      tipo_leche: row.tipo_leche,
      loyalty_reward: row.loyalty_reward,
      discount_amount: row.discount_amount,
    })),
    payment: {
      payment_method: paymentFields.payment_method,
      payment_date: paymentFields.payment_date,
      cash_amount: paymentFields.cash_amount,
      plin_amount: paymentFields.plin_amount,
      cash_received: paymentFields.cash_received,
    },
    payment_entries: paymentEntries,
    accounts: {
      caja_id: params.cajaAccountId,
      banco_id: params.bancoAccountId,
      rappi_id: params.rappiAccountId,
      pos_id: params.posAccountId,
    },
  };

  // --- Single atomic RPC call ---
  const supabase = createClient();
  const { data: saleId, error } = await supabase.rpc("create_sale_atomic", {
    p_payload: payload,
  });
  if (error) throw error;

  // --- Post-success side-effects (audit log + display number) ---
  const newSaleId = saleId as number;
  const saleNumber = await getSaleNumber(newSaleId);

  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "crear_venta",
    targetTable: "sales",
    targetId: newSaleId,
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
    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "crear_transaccion",
      targetTable: "transactions",
      targetDescription: `Venta #${saleNumber} - ${params.paymentMethod} - S/ ${params.totalPrice.toFixed(2)}`,
      details: {
        venta_id: newSaleId,
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
  // --- Client-side UX pre-validation (fast-fail before network round-trip) ---
  const discountAmount = round2(
    Math.min(Math.max(params.discountAmount || 0, 0), params.totalPrice),
  );
  const netPayable = round2(params.totalPrice - discountAmount);
  if (netPayable < 0) {
    throw new Error("El total a cobrar no puede ser negativo");
  }
  const netParams = { ...params, totalPrice: netPayable };
  validateSplitPayment(netParams);
  const paymentFields = buildPaymentFields(netParams);
  validateCashReceived(paymentFields);

  // Pre-compute commission for building payment_entries sent to the RPC.
  // The RPC recomputes server-side and is authoritative; this is for UX only.
  const commission = computeCommission(
    params.orderType,
    params.totalPrice,
    discountAmount,
    paymentFields.payment_method,
  );

  // Build payment_entries: [] means "revert existing transactions only" (idempotent).
  const saleNumber = await getSaleNumber(saleId);
  const paymentEntries = params.registerPayment
    ? buildSalePayments({
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
      })
    : [];

  // Derive kept_delivered_ids — IDs of Entregado sale_products the editor chose to keep.
  // The RPC uses this list to detect which Entregado rows to remove (admin-only sub-op).
  const keptDeliveredIds = params.saleProducts
    .filter((p) => p.status === "Entregado" && p.id != null)
    .map((p) => p.id as number);

  // Build pending product rows (Entregado items excluded — RPC handles them separately).
  const pendingProductRows = buildSaleProductRows(saleId, params).map((row) => ({
    product_id: row.product_id,
    quantity: row.quantity,
    unit_price: row.unit_price,
    unit_cost: row.unit_cost,
    temperatura: row.temperatura ?? null,
    tipo_leche: row.tipo_leche ?? null,
    loyalty_reward: row.loyalty_reward ?? null,
    discount_amount: row.discount_amount,
    status: "Pendiente" as const,
  }));

  // --- Assemble the atomic payload ---
  const payload = {
    header: {
      order_type: params.orderType,
      table_number: params.orderType === "Mesa" ? parseInt(params.tableNumber) || null : null,
      notes: params.notes.trim() || null,
      customer_dni: params.customerDni || null,
      total_price: params.totalPrice,
      discount_amount: discountAmount,
    },
    payment: {
      payment_method: paymentFields.payment_method,
      payment_date: paymentFields.payment_date,
      cash_amount: paymentFields.cash_amount,
      plin_amount: paymentFields.plin_amount,
      cash_received: paymentFields.cash_received,
    },
    products: pendingProductRows,
    kept_delivered_ids: keptDeliveredIds,
    payment_entries: paymentEntries,
  };

  // --- Single atomic RPC call ---
  const supabase = createClient();
  const { error } = await supabase.rpc("update_sale_atomic", {
    p_sale_id: saleId,
    p_payload: payload,
    p_user_id: params.userId ?? undefined,
  });
  if (error) throw error;

  // --- Post-success side-effects (audit log) ---
  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "actualizar",
    targetTable: "sales",
    targetId: saleId,
    targetDescription: paymentFields.payment_method
      ? `Venta #${saleNumber} - ${paymentFields.payment_method} - S/ ${params.totalPrice.toFixed(2)}`
      : `Venta #${saleNumber} - S/ ${params.totalPrice.toFixed(2)}`,
    details: {
      metodo_pago: paymentFields.payment_method,
      total: params.totalPrice,
      descuento: discountAmount,
      commission,
      productos: params.saleProducts.length,
    },
  });
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

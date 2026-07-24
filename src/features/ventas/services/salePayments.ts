import type { SaleSubmitParams } from "../types";
import { RAPPI_COMMISSION_RATE, POS_COMMISSION_RATE } from "../constants";
import { resolveLineDiscount, round2 } from "../utils/discount";
import {
  buildPaymentFields,
  validateSplitPayment,
  validateCashReceived,
} from "./paymentHelpers";

export interface SalePayment {
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

export function buildSaleProductRows(saleId: number, params: SaleSubmitParams) {
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

export interface SaleSubmitContext {
  discountAmount: number;
  netPayable: number;
  paymentFields: ReturnType<typeof buildPaymentFields>;
  commission: number | null;
  paymentEntries: SalePayment[];
}

/**
 * Shared client-side pre-validation for create/update: clamps the discount,
 * validates the split payment and cash received, computes the commission (UX
 * only — the RPC is authoritative), and builds the payment_entries.
 * `saleNumber` labels the payment descriptions (0 on create; the RPC assigns
 * the real id).
 */
export function prepareSaleSubmit(
  params: SaleSubmitParams,
  saleNumber: number,
): SaleSubmitContext {
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

  const commission = computeCommission(
    params.orderType,
    params.totalPrice,
    discountAmount,
    paymentFields.payment_method,
  );

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

  return { discountAmount, netPayable, paymentFields, commission, paymentEntries };
}

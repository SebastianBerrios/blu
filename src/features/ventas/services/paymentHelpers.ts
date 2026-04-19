import type { PaymentMethod } from "@/types";
import type { SaleSubmitParams } from "../types";

export interface PaymentFields {
  payment_method: PaymentMethod | null;
  payment_date: string | null;
  cash_amount: number | null;
  plin_amount: number | null;
  cash_received: number | null;
}

export function buildPaymentFields(params: SaleSubmitParams): PaymentFields {
  if (!params.registerPayment) {
    return {
      payment_method: null,
      payment_date: null,
      cash_amount: null,
      plin_amount: null,
      cash_received: null,
    };
  }

  const cash_amount =
    params.paymentMethod === "Efectivo"
      ? params.totalPrice
      : params.paymentMethod === "Efectivo + Plin"
        ? parseFloat(params.cashAmount)
        : null;

  const plin_amount =
    params.paymentMethod === "Plin"
      ? params.totalPrice
      : params.paymentMethod === "Efectivo + Plin"
        ? parseFloat(params.plinAmount)
        : null;

  let cash_received: number | null = null;
  if (cash_amount !== null) {
    const parsed = params.cashReceived ? parseFloat(params.cashReceived) : NaN;
    cash_received = isFinite(parsed) ? parsed : cash_amount;
  }

  return {
    payment_method: params.paymentMethod,
    payment_date: params.existingPaymentDate ?? new Date().toISOString(),
    cash_amount,
    plin_amount,
    cash_received,
  };
}

export function validateSplitPayment(params: SaleSubmitParams): void {
  if (!params.registerPayment || params.paymentMethod !== "Efectivo + Plin")
    return;

  const cash = parseFloat(params.cashAmount);
  const plin = parseFloat(params.plinAmount);

  if (isNaN(cash) || isNaN(plin) || cash < 0 || plin < 0) {
    throw new Error("Ingresa montos válidos");
  }
  if (Math.abs(cash + plin - params.totalPrice) > 0.01) {
    throw new Error("Los montos deben sumar el total de la venta");
  }
}

export function validateCashReceived(fields: PaymentFields): void {
  if (fields.cash_amount === null) return;
  if (fields.cash_received === null) return;
  if (fields.cash_received < fields.cash_amount) {
    throw new Error("El efectivo recibido debe ser mayor o igual al monto en efectivo");
  }
}

export function buildPaymentAmounts(
  paymentMethod: PaymentMethod,
  totalPrice: number,
  cashAmount: string,
  plinAmount: string
): { cash: number | null; plin: number | null } {
  if (paymentMethod === "Efectivo") {
    return { cash: totalPrice, plin: null };
  }
  if (paymentMethod === "Plin") {
    return { cash: null, plin: totalPrice };
  }
  const cash = parseFloat(cashAmount);
  const plin = parseFloat(plinAmount);
  if (isNaN(cash) || isNaN(plin) || cash < 0 || plin < 0) {
    throw new Error("Ingresa montos válidos");
  }
  if (Math.abs(cash + plin - totalPrice) > 0.01) {
    throw new Error("Los montos deben sumar el total de la venta");
  }
  return { cash, plin };
}

export function resolveCashReceived(
  cash: number | null,
  cashReceivedRaw: string
): number | null {
  if (cash === null) return null;
  const parsed = cashReceivedRaw ? parseFloat(cashReceivedRaw) : NaN;
  const received = isFinite(parsed) ? parsed : cash;
  if (received < cash) {
    throw new Error("El efectivo recibido debe ser mayor o igual al monto en efectivo");
  }
  return received;
}

export function paymentStateChanged(
  oldState: {
    payment_method: string | null;
    cash_amount: number | null;
    plin_amount: number | null;
  },
  newState: PaymentFields
): boolean {
  const normalize = (x: number | null | undefined) => x ?? 0;
  if ((oldState.payment_method ?? null) !== (newState.payment_method ?? null))
    return true;
  if (Math.abs(normalize(oldState.cash_amount) - normalize(newState.cash_amount)) > 0.01)
    return true;
  if (Math.abs(normalize(oldState.plin_amount) - normalize(newState.plin_amount)) > 0.01)
    return true;
  return false;
}

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SaleSubmitParams } from "../types";
import {
  buildPaymentFields,
  validateSplitPayment,
  validateCashReceived,
  buildPaymentAmounts,
  resolveCashReceived,
  paymentStateChanged,
  type PaymentFields,
} from "./paymentHelpers";

function makeParams(overrides: Partial<SaleSubmitParams> = {}): SaleSubmitParams {
  return {
    orderType: "Mesa",
    tableNumber: "1",
    customerDni: "",
    saleProducts: [],
    totalPrice: 100,
    discountAmount: 0,
    registerPayment: true,
    paymentMethod: "Efectivo",
    cashAmount: "",
    plinAmount: "",
    cashReceived: "",
    notes: "",
    userId: null,
    userName: null,
    cajaAccountId: 1,
    bancoAccountId: 2,
    rappiAccountId: 3,
    posAccountId: null,
    existingPaymentDate: null,
    ...overrides,
  };
}

const FIXED_DATE = "2026-05-04T12:00:00.000Z";

describe("buildPaymentFields", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_DATE));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns all-null when registerPayment is false", () => {
    const result = buildPaymentFields(makeParams({ registerPayment: false }));
    expect(result).toEqual({
      payment_method: null,
      payment_date: null,
      cash_amount: null,
      plin_amount: null,
      cash_received: null,
    });
  });

  it("Rappi: sets method=Rappi, no cash/plin amounts, payment_date=now", () => {
    const result = buildPaymentFields(
      makeParams({ paymentMethod: "Rappi", totalPrice: 50 }),
    );
    expect(result).toEqual({
      payment_method: "Rappi",
      payment_date: FIXED_DATE,
      cash_amount: null,
      plin_amount: null,
      cash_received: null,
    });
  });

  it("Rappi: preserves existingPaymentDate when provided", () => {
    const existing = "2025-01-01T08:00:00.000Z";
    const result = buildPaymentFields(
      makeParams({ paymentMethod: "Rappi", existingPaymentDate: existing }),
    );
    expect(result.payment_date).toBe(existing);
  });

  it("Efectivo: cash_amount = totalPrice, plin_amount = null", () => {
    const result = buildPaymentFields(
      makeParams({ paymentMethod: "Efectivo", totalPrice: 50 }),
    );
    expect(result.cash_amount).toBe(50);
    expect(result.plin_amount).toBeNull();
    expect(result.payment_method).toBe("Efectivo");
  });

  it("Efectivo: defaults cash_received to cash_amount when empty", () => {
    const result = buildPaymentFields(
      makeParams({ paymentMethod: "Efectivo", totalPrice: 50, cashReceived: "" }),
    );
    expect(result.cash_received).toBe(50);
  });

  it("Efectivo: parses cashReceived when provided", () => {
    const result = buildPaymentFields(
      makeParams({ paymentMethod: "Efectivo", totalPrice: 50, cashReceived: "100" }),
    );
    expect(result.cash_received).toBe(100);
  });

  it("Plin: plin_amount = totalPrice, cash_amount = null, no cash_received", () => {
    const result = buildPaymentFields(
      makeParams({ paymentMethod: "Plin", totalPrice: 80 }),
    );
    expect(result.plin_amount).toBe(80);
    expect(result.cash_amount).toBeNull();
    expect(result.cash_received).toBeNull();
  });

  it("Efectivo + Plin: parses both inputs", () => {
    const result = buildPaymentFields(
      makeParams({
        paymentMethod: "Efectivo + Plin",
        totalPrice: 100,
        cashAmount: "60",
        plinAmount: "40",
        cashReceived: "70",
      }),
    );
    expect(result.cash_amount).toBe(60);
    expect(result.plin_amount).toBe(40);
    expect(result.cash_received).toBe(70);
  });
});

describe("validateSplitPayment", () => {
  it("no-ops when registerPayment is false", () => {
    expect(() =>
      validateSplitPayment(makeParams({ registerPayment: false })),
    ).not.toThrow();
  });

  it("no-ops when paymentMethod is not split", () => {
    expect(() =>
      validateSplitPayment(makeParams({ paymentMethod: "Efectivo" })),
    ).not.toThrow();
  });

  it("throws on NaN amounts", () => {
    expect(() =>
      validateSplitPayment(
        makeParams({
          paymentMethod: "Efectivo + Plin",
          cashAmount: "abc",
          plinAmount: "10",
        }),
      ),
    ).toThrow("Ingresa montos válidos");
  });

  it("throws on negative amounts", () => {
    expect(() =>
      validateSplitPayment(
        makeParams({
          paymentMethod: "Efectivo + Plin",
          cashAmount: "-1",
          plinAmount: "101",
        }),
      ),
    ).toThrow("Ingresa montos válidos");
  });

  it("throws when cash + plin doesn't equal totalPrice", () => {
    expect(() =>
      validateSplitPayment(
        makeParams({
          paymentMethod: "Efectivo + Plin",
          cashAmount: "30",
          plinAmount: "30",
          totalPrice: 100,
        }),
      ),
    ).toThrow("Los montos deben sumar el total de la venta");
  });

  it("passes when sum matches within ±0.01 tolerance", () => {
    expect(() =>
      validateSplitPayment(
        makeParams({
          paymentMethod: "Efectivo + Plin",
          cashAmount: "60.005",
          plinAmount: "40",
          totalPrice: 100,
        }),
      ),
    ).not.toThrow();
  });
});

describe("validateCashReceived", () => {
  function makeFields(overrides: Partial<PaymentFields> = {}): PaymentFields {
    return {
      payment_method: "Efectivo",
      payment_date: null,
      cash_amount: 50,
      plin_amount: null,
      cash_received: 50,
      ...overrides,
    };
  }

  it("no-ops when cash_amount is null", () => {
    expect(() =>
      validateCashReceived(makeFields({ cash_amount: null })),
    ).not.toThrow();
  });

  it("no-ops when cash_received is null", () => {
    expect(() =>
      validateCashReceived(makeFields({ cash_received: null })),
    ).not.toThrow();
  });

  it("throws when cash_received is less than cash_amount", () => {
    expect(() =>
      validateCashReceived(makeFields({ cash_amount: 50, cash_received: 30 })),
    ).toThrow("El efectivo recibido debe ser mayor o igual al monto en efectivo");
  });

  it("passes when equal", () => {
    expect(() =>
      validateCashReceived(makeFields({ cash_amount: 50, cash_received: 50 })),
    ).not.toThrow();
  });

  it("passes when received is greater (cliente da más)", () => {
    expect(() =>
      validateCashReceived(makeFields({ cash_amount: 50, cash_received: 100 })),
    ).not.toThrow();
  });
});

describe("buildPaymentAmounts", () => {
  it("Efectivo: cash = totalPrice, plin = null", () => {
    expect(buildPaymentAmounts("Efectivo", 50, "", "")).toEqual({
      cash: 50,
      plin: null,
    });
  });

  it("Plin: cash = null, plin = totalPrice", () => {
    expect(buildPaymentAmounts("Plin", 50, "", "")).toEqual({
      cash: null,
      plin: 50,
    });
  });

  it("Efectivo + Plin: parses both", () => {
    expect(buildPaymentAmounts("Efectivo + Plin", 100, "60", "40")).toEqual({
      cash: 60,
      plin: 40,
    });
  });

  it("throws on NaN inputs in split mode", () => {
    expect(() => buildPaymentAmounts("Efectivo + Plin", 100, "x", "40")).toThrow(
      "Ingresa montos válidos",
    );
  });

  it("throws when split sum mismatches totalPrice", () => {
    expect(() => buildPaymentAmounts("Efectivo + Plin", 100, "30", "30")).toThrow(
      "Los montos deben sumar el total de la venta",
    );
  });
});

describe("resolveCashReceived", () => {
  it("returns null when cash is null", () => {
    expect(resolveCashReceived(null, "100")).toBeNull();
  });

  it("returns cash when cashReceivedRaw is empty", () => {
    expect(resolveCashReceived(50, "")).toBe(50);
  });

  it("parses raw value when provided", () => {
    expect(resolveCashReceived(50, "75")).toBe(75);
  });

  it("falls back to cash when raw value is unparseable", () => {
    expect(resolveCashReceived(50, "not-a-number")).toBe(50);
  });

  it("throws when received < cash", () => {
    expect(() => resolveCashReceived(50, "30")).toThrow(
      "El efectivo recibido debe ser mayor o igual al monto en efectivo",
    );
  });
});

describe("paymentStateChanged", () => {
  function fields(overrides: Partial<PaymentFields> = {}): PaymentFields {
    return {
      payment_method: "Efectivo",
      payment_date: null,
      cash_amount: 50,
      plin_amount: null,
      cash_received: 50,
      ...overrides,
    };
  }

  it("false when nothing changed", () => {
    const old = { payment_method: "Efectivo", cash_amount: 50, plin_amount: null };
    expect(paymentStateChanged(old, fields())).toBe(false);
  });

  it("true when payment_method differs", () => {
    const old = { payment_method: "Plin", cash_amount: 50, plin_amount: null };
    expect(paymentStateChanged(old, fields())).toBe(true);
  });

  it("true when cash_amount differs by more than 0.01", () => {
    const old = { payment_method: "Efectivo", cash_amount: 40, plin_amount: null };
    expect(paymentStateChanged(old, fields())).toBe(true);
  });

  it("false when cash_amount differs by less than 0.01", () => {
    const old = { payment_method: "Efectivo", cash_amount: 50.005, plin_amount: null };
    expect(paymentStateChanged(old, fields())).toBe(false);
  });

  it("true when plin_amount differs", () => {
    const old = { payment_method: "Plin", cash_amount: null, plin_amount: 30 };
    const next = fields({ payment_method: "Plin", cash_amount: null, plin_amount: 60 });
    expect(paymentStateChanged(old, next)).toBe(true);
  });

  it("normalizes nulls as 0 (no change when both are null/0)", () => {
    const old = { payment_method: "Efectivo", cash_amount: 50, plin_amount: null };
    const next = fields({ plin_amount: 0 });
    expect(paymentStateChanged(old, next)).toBe(false);
  });
});

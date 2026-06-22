import { describe, it, expect } from "vitest";
import {
  getSaleCommission,
  getSaleNet,
  getCommissionKind,
  getCommissionLabel,
  getCommissionShortPct,
} from "./saleAmounts";

describe("getSaleCommission", () => {
  it("returns the stored commission when present and > 0", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: 25,
        payment_method: "Rappi",
        order_type: "Rappi",
      }),
    ).toBe(25);
  });

  it("returns 0 when no commission stored and not Rappi", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: null,
        payment_method: "Efectivo",
        order_type: "Mesa",
      }),
    ).toBe(0);
  });

  it("computes 20% commission when order_type is Rappi", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(20);
  });

  it("computes 20% commission when payment_method is Rappi (even if order_type isn't)", () => {
    expect(
      getSaleCommission({
        total_price: 50,
        commission: null,
        payment_method: "Rappi",
        order_type: "Mesa",
      }),
    ).toBe(10);
  });

  it("treats commission=0 as missing (recomputes from rate)", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: 0,
        payment_method: "Rappi",
        order_type: "Rappi",
      }),
    ).toBe(20);
  });

  it("rounds the computed commission to 2 decimals", () => {
    expect(
      getSaleCommission({
        total_price: 33.33,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(6.67);
  });

  it("Rappi: computa comisión sobre el monto rebajado por descuento", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        discount_amount: 20,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(16); // (100 − 20) × 0.2
  });

  it("POS: computa 3.44% cuando payment_method es POS", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: null,
        payment_method: "POS",
        order_type: "Mesa",
      }),
    ).toBe(3.44); // 100 × 0.0344
  });

  it("POS: computa comisión sobre el monto rebajado por descuento", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        discount_amount: 20,
        commission: null,
        payment_method: "POS",
        order_type: "Mesa",
      }),
    ).toBe(2.75); // (100 − 20) × 0.0344 = 2.752 → 2.75
  });

  it("POS: redondea la comisión computada a 2 decimales", () => {
    expect(
      getSaleCommission({
        total_price: 33.33,
        commission: null,
        payment_method: "POS",
        order_type: "Mesa",
      }),
    ).toBe(1.15); // 33.33 × 0.0344 = 1.146552 → 1.15
  });

  it("Rappi tiene precedencia sobre POS cuando ambos aplican", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: null,
        payment_method: "POS",
        order_type: "Rappi",
      }),
    ).toBe(20); // isRappi gana → 20%, no 3.44%
  });

  it("POS: comisión 0 cuando el total es 0 (bebida gratis de fidelidad)", () => {
    expect(
      getSaleCommission({
        total_price: 0,
        commission: null,
        payment_method: "POS",
        order_type: "Mesa",
      }),
    ).toBe(0);
  });
});

describe("getCommissionKind / label / shortPct", () => {
  const rappi = { total_price: 100, commission: null, payment_method: "Rappi", order_type: "Rappi" };
  const pos = { total_price: 100, commission: null, payment_method: "POS", order_type: "Mesa" };
  const efectivo = { total_price: 100, commission: null, payment_method: "Efectivo", order_type: "Mesa" };

  it("clasifica Rappi, POS y sin comisión", () => {
    expect(getCommissionKind(rappi)).toBe("rappi");
    expect(getCommissionKind(pos)).toBe("pos");
    expect(getCommissionKind(efectivo)).toBe(null);
  });

  it("Rappi tiene precedencia sobre POS en la clasificación", () => {
    expect(
      getCommissionKind({ total_price: 100, commission: null, payment_method: "POS", order_type: "Rappi" }),
    ).toBe("rappi");
  });

  it("getCommissionLabel produce la etiqueta correcta", () => {
    expect(getCommissionLabel(rappi)).toBe("Comisión Rappi 20%");
    expect(getCommissionLabel(pos)).toBe("Comisión POS 3.44%");
    expect(getCommissionLabel(efectivo)).toBe("");
  });

  it("getCommissionShortPct produce el porcentaje corto", () => {
    expect(getCommissionShortPct(rappi)).toBe("20%");
    expect(getCommissionShortPct(pos)).toBe("3.44%");
    expect(getCommissionShortPct(efectivo)).toBe("");
  });
});

describe("getSaleNet", () => {
  it("returns total minus stored commission", () => {
    expect(
      getSaleNet({
        total_price: 100,
        commission: 20,
        payment_method: "Rappi",
        order_type: "Rappi",
      }),
    ).toBe(80);
  });

  it("returns total when no commission applies", () => {
    expect(
      getSaleNet({
        total_price: 50,
        commission: null,
        payment_method: "Efectivo",
        order_type: "Mesa",
      }),
    ).toBe(50);
  });

  it("computes net for Rappi without stored commission", () => {
    expect(
      getSaleNet({
        total_price: 100,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(80);
  });

  it("rounds to 2 decimals", () => {
    expect(
      getSaleNet({
        total_price: 33.33,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(26.66);
  });

  it("resta el descuento en ventas no-Rappi", () => {
    expect(
      getSaleNet({
        total_price: 100,
        discount_amount: 30,
        commission: null,
        payment_method: "Efectivo",
        order_type: "Mesa",
      }),
    ).toBe(70);
  });

  it("Rappi con descuento: neto = (total − desc) × 0.8", () => {
    expect(
      getSaleNet({
        total_price: 100,
        discount_amount: 20,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(64); // 80 − 16
  });

  it("POS: neto = total − comisión 3.44%", () => {
    expect(
      getSaleNet({
        total_price: 100,
        commission: null,
        payment_method: "POS",
        order_type: "Mesa",
      }),
    ).toBe(96.56); // 100 − 3.44
  });

  it("POS con descuento: neto = (total − desc) − comisión POS", () => {
    expect(
      getSaleNet({
        total_price: 100,
        discount_amount: 20,
        commission: null,
        payment_method: "POS",
        order_type: "Mesa",
      }),
    ).toBe(77.25); // 80 − 2.75
  });
});

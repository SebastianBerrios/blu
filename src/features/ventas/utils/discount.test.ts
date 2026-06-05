import { describe, it, expect } from "vitest";
import {
  resolveDiscount,
  resolveLineDiscount,
  computeSaleDiscount,
} from "./discount";
import type { SaleProductLine } from "../types";

function line(overrides: Partial<SaleProductLine> = {}): SaleProductLine {
  return {
    product_id: 1,
    product_name: "X",
    quantity: 1,
    unit_price: 10,
    subtotal: 10,
    temperatura: null,
    tipo_leche: null,
    category_id: null,
    loyalty_reward: null,
    ...overrides,
  };
}

describe("resolveDiscount", () => {
  it("monto fijo se toma tal cual", () => {
    expect(resolveDiscount("monto", 5, 20)).toBe(5);
  });

  it("porcentaje se aplica sobre la base", () => {
    expect(resolveDiscount("porcentaje", 25, 20)).toBe(5);
  });

  it("hace clamp al máximo de la base (monto)", () => {
    expect(resolveDiscount("monto", 50, 20)).toBe(20);
  });

  it("hace clamp al 100% (porcentaje)", () => {
    expect(resolveDiscount("porcentaje", 150, 20)).toBe(20);
  });

  it("valores no positivos o base 0 → 0", () => {
    expect(resolveDiscount("monto", 0, 20)).toBe(0);
    expect(resolveDiscount("monto", -5, 20)).toBe(0);
    expect(resolveDiscount("porcentaje", 10, 0)).toBe(0);
  });

  it("redondea a 2 decimales", () => {
    expect(resolveDiscount("porcentaje", 33.333, 10)).toBe(3.33);
  });
});

describe("resolveLineDiscount", () => {
  it("usa mode/value cuando están presentes", () => {
    expect(
      resolveLineDiscount(line({ subtotal: 40, discount_mode: "porcentaje", discount_value: 10 })),
    ).toBe(4);
  });

  it("cae a discount_amount cuando no hay mode/value (línea cargada)", () => {
    expect(
      resolveLineDiscount(line({ subtotal: 40, discount_amount: 7 })),
    ).toBe(7);
  });

  it("clamp del discount_amount al subtotal", () => {
    expect(
      resolveLineDiscount(line({ subtotal: 5, discount_amount: 99 })),
    ).toBe(5);
  });
});

describe("computeSaleDiscount", () => {
  it("combina descuentos de línea + nivel total (porcentaje sobre el remanente)", () => {
    const lines = [
      line({ subtotal: 40, discount_mode: "monto", discount_value: 10 }), // −10
      line({ subtotal: 60 }), // sin descuento
    ];
    // bruto = 100, líneas = 10, base nivel total = 90, 10% = 9
    const r = computeSaleDiscount(lines, { mode: "porcentaje", value: 10 });
    expect(r.grossTotal).toBe(100);
    expect(r.lineDiscountTotal).toBe(10);
    expect(r.totalDiscount).toBe(9);
    expect(r.discountAmount).toBe(19);
    expect(r.netPayable).toBe(81);
  });

  it("sin descuentos → neto = bruto", () => {
    const r = computeSaleDiscount([line({ subtotal: 30 })], null);
    expect(r.discountAmount).toBe(0);
    expect(r.netPayable).toBe(30);
  });

  it("descuento total monto fijo sobre remanente con clamp", () => {
    const lines = [line({ subtotal: 20, discount_mode: "monto", discount_value: 5 })];
    // bruto 20, línea 5, remanente 15, descuento total monto 100 → clamp a 15
    const r = computeSaleDiscount(lines, { mode: "monto", value: 100 });
    expect(r.discountAmount).toBe(20);
    expect(r.netPayable).toBe(0);
  });
});

import type { DiscountMode, SaleProductLine } from "../types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Resuelve un descuento (porcentaje o monto fijo) a S/ y lo limita a [0, base].
 * Un porcentaje se aplica sobre `base`; un monto se toma tal cual.
 */
export function resolveDiscount(
  mode: DiscountMode,
  value: number,
  base: number,
): number {
  if (!Number.isFinite(value) || value <= 0 || base <= 0) return 0;
  const raw = mode === "porcentaje" ? (base * value) / 100 : value;
  return round2(Math.min(Math.max(raw, 0), base));
}

/**
 * Descuento resuelto (S/) de una línea sobre su subtotal. Usa `discount_mode`/
 * `discount_value` si vienen del formulario; si no, cae a `discount_amount`
 * (caso de líneas cargadas desde una venta existente).
 */
export function resolveLineDiscount(line: SaleProductLine): number {
  const base = line.subtotal;
  if (line.discount_mode && line.discount_value) {
    return resolveDiscount(line.discount_mode, line.discount_value, base);
  }
  return round2(Math.min(Math.max(line.discount_amount ?? 0, 0), base));
}

export interface SaleDiscountResult {
  /** Suma de descuentos de línea resueltos (S/). */
  lineDiscountTotal: number;
  /** Descuento de nivel total resuelto (S/), aplicado tras los de línea. */
  totalDiscount: number;
  /** Descuento total de la venta (S/) = líneas + nivel total. */
  discountAmount: number;
  /** Bruto = Σ subtotales sin descuento. */
  grossTotal: number;
  /** Neto a cobrar = bruto − descuento total. */
  netPayable: number;
}

/**
 * Combina descuentos por línea + un descuento de nivel total. El de nivel total
 * (si es porcentaje) se calcula sobre el bruto ya rebajado por los de línea.
 */
export function computeSaleDiscount(
  lines: SaleProductLine[],
  totalLevel: { mode: DiscountMode; value: number } | null,
): SaleDiscountResult {
  const grossTotal = round2(lines.reduce((s, l) => s + l.subtotal, 0));
  const lineDiscountTotal = round2(
    lines.reduce((s, l) => s + resolveLineDiscount(l), 0),
  );
  const baseForTotal = round2(grossTotal - lineDiscountTotal);
  const totalDiscount = totalLevel
    ? resolveDiscount(totalLevel.mode, totalLevel.value, baseForTotal)
    : 0;
  const discountAmount = round2(lineDiscountTotal + totalDiscount);
  const netPayable = round2(grossTotal - discountAmount);
  return {
    lineDiscountTotal,
    totalDiscount,
    discountAmount,
    grossTotal,
    netPayable,
  };
}

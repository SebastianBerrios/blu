import { RAPPI_COMMISSION_RATE } from "../constants";

interface SaleAmountInput {
  total_price: number;
  commission: number | null;
  payment_method: string | null;
  order_type: string;
  discount_amount?: number | null;
}

/** Monto rebajado por descuento sobre el bruto (S/), nunca negativo. */
function discountedSubtotal(sale: SaleAmountInput): number {
  const discount = Number(sale.discount_amount ?? 0) || 0;
  return Math.max(0, sale.total_price - discount);
}

export function getSaleCommission(sale: SaleAmountInput): number {
  if (sale.commission != null && sale.commission > 0) return Number(sale.commission);
  const isRappi = sale.order_type === "Rappi" || sale.payment_method === "Rappi";
  if (!isRappi) return 0;
  // La comisión Rappi se calcula sobre el monto ya rebajado por descuento.
  return Number((discountedSubtotal(sale) * RAPPI_COMMISSION_RATE).toFixed(2));
}

export function getSaleNet(sale: SaleAmountInput): number {
  return Number((discountedSubtotal(sale) - getSaleCommission(sale)).toFixed(2));
}

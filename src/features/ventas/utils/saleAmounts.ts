import { RAPPI_COMMISSION_RATE } from "../constants";

interface SaleAmountInput {
  total_price: number;
  commission: number | null;
  payment_method: string | null;
  order_type: string;
}

export function getSaleCommission(sale: SaleAmountInput): number {
  if (sale.commission != null && sale.commission > 0) return Number(sale.commission);
  const isRappi = sale.order_type === "Rappi" || sale.payment_method === "Rappi";
  if (!isRappi) return 0;
  return Number((sale.total_price * RAPPI_COMMISSION_RATE).toFixed(2));
}

export function getSaleNet(sale: SaleAmountInput): number {
  return Number((sale.total_price - getSaleCommission(sale)).toFixed(2));
}

"use client";

import { DollarSign, Receipt, ShoppingBag, TrendingUp, Percent, ShoppingCart } from "lucide-react";
import type { SalesKPIsWithDelta } from "@/types";
import KPICard from "./KPICard";

interface KPIGridProps {
  kpis: SalesKPIsWithDelta;
  sparkline: number[];
  previousLabel: string;
  onKpiClick?: (id: KPIId) => void;
}

export type KPIId =
  | "revenue"
  | "avgTicket"
  | "productsSold"
  | "totalSales"
  | "grossMargin"
  | "grossMarginPct";

function formatCurrency(v: number): string {
  return `S/ ${v.toFixed(2)}`;
}

export default function KPIGrid({ kpis, sparkline, previousLabel, onKpiClick }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPICard
        icon={<DollarSign className="w-5 h-5" />}
        label="Ingresos"
        value={formatCurrency(kpis.revenue.current)}
        kpi={kpis.revenue}
        previousLabel={previousLabel}
        formatPrevious={formatCurrency}
        sparkline={sparkline}
        accent="green"
        onClick={onKpiClick ? () => onKpiClick("revenue") : undefined}
      />
      <KPICard
        icon={<Receipt className="w-5 h-5" />}
        label="Ticket Promedio"
        value={formatCurrency(kpis.avgTicket.current)}
        kpi={kpis.avgTicket}
        previousLabel={previousLabel}
        formatPrevious={formatCurrency}
        sparkline={sparkline}
        accent="purple"
        onClick={onKpiClick ? () => onKpiClick("avgTicket") : undefined}
      />
      <KPICard
        icon={<ShoppingCart className="w-5 h-5" />}
        label="Total Ventas"
        value={String(kpis.totalSales.current)}
        kpi={kpis.totalSales}
        previousLabel={previousLabel}
        formatPrevious={(v) => String(Math.round(v))}
        sparkline={sparkline}
        accent="primary"
        onClick={onKpiClick ? () => onKpiClick("totalSales") : undefined}
      />
      <KPICard
        icon={<ShoppingBag className="w-5 h-5" />}
        label="Productos Vendidos"
        value={String(kpis.productsSold.current)}
        kpi={kpis.productsSold}
        previousLabel={previousLabel}
        formatPrevious={(v) => String(Math.round(v))}
        sparkline={sparkline}
        accent="amber"
        onClick={onKpiClick ? () => onKpiClick("productsSold") : undefined}
      />
      <KPICard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Margen Bruto"
        value={formatCurrency(kpis.grossMargin.current)}
        kpi={kpis.grossMargin}
        previousLabel={previousLabel}
        formatPrevious={formatCurrency}
        sparkline={sparkline}
        accent="emerald"
        onClick={onKpiClick ? () => onKpiClick("grossMargin") : undefined}
      />
      <KPICard
        icon={<Percent className="w-5 h-5" />}
        label="Margen %"
        value={`${kpis.grossMarginPct.current.toFixed(1)}%`}
        kpi={kpis.grossMarginPct}
        previousLabel={previousLabel}
        formatPrevious={(v) => `${v.toFixed(1)}%`}
        accent="blue"
        onClick={onKpiClick ? () => onKpiClick("grossMarginPct") : undefined}
      />
    </div>
  );
}

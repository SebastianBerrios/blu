"use client";

import { DollarSign, TrendingUp, Receipt, ShoppingBag } from "lucide-react";
import type { SalesKPIs } from "@/types";
import KPICard from "./KPICard";

interface KPIGridProps {
  kpis: SalesKPIs;
}

export default function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <KPICard
        icon={<DollarSign className="w-5 h-5" />}
        label="Ingresos Hoy"
        value={`S/ ${kpis.dailyRevenue.toFixed(2)}`}
        color="text-green-700 bg-green-50 border-green-200"
        iconColor="text-green-600"
      />
      <KPICard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Ingresos Mes"
        value={`S/ ${kpis.monthlyRevenue.toFixed(2)}`}
        color="text-blue-700 bg-blue-50 border-blue-200"
        iconColor="text-blue-600"
      />
      <KPICard
        icon={<Receipt className="w-5 h-5" />}
        label="Ticket Promedio"
        value={`S/ ${kpis.avgTicket.toFixed(2)}`}
        color="text-purple-700 bg-purple-50 border-purple-200"
        iconColor="text-purple-600"
      />
      <KPICard
        icon={<ShoppingBag className="w-5 h-5" />}
        label="Productos Vendidos"
        value={String(kpis.productsSold)}
        color="text-amber-700 bg-amber-50 border-amber-200"
        iconColor="text-amber-600"
      />
      <KPICard
        icon={<Receipt className="w-5 h-5" />}
        label="Total Ventas"
        value={String(kpis.totalSales)}
        color="text-primary-700 bg-primary-50 border-primary-200"
        iconColor="text-primary-600"
      />
    </div>
  );
}

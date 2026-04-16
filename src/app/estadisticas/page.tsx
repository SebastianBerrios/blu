"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useSalesStats } from "@/hooks/useSalesStats";
import type { DateRange, DateRangePreset } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import {
  KPIGrid,
  StatsChartsGrid,
  TopProductsTable,
  PresetSelector,
  getDateRange,
} from "@/features/estadisticas";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function EstadisticasPage() {
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRange("30d"));

  const handlePresetChange = (p: DateRangePreset) => {
    setPreset(p);
    setDateRange(getDateRange(p));
  };

  const {
    kpis,
    revenueByDay,
    revenueByMethod,
    topProducts,
    salesByOrderType,
    salesByHour,
    revenueVsExpenses,
    isLoading,
  } = useSalesStats(dateRange);

  const totalRevenue = topProducts.reduce((sum, p) => sum + p.totalRevenue, 0);

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Estadísticas"
        icon={<BarChart3 className="w-6 h-6 text-primary-700" />}
        action={<PresetSelector preset={preset} onChange={handlePresetChange} />}
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto space-y-4 md:space-y-6">
        <PresetSelector
          preset={preset}
          onChange={handlePresetChange}
          variant="mobile"
        />

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Cargando estadísticas...</div>
        ) : (
          <>
            <KPIGrid kpis={kpis} />
            <StatsChartsGrid
              revenueByDay={revenueByDay}
              revenueByMethod={revenueByMethod}
              topProducts={topProducts}
              salesByOrderType={salesByOrderType}
              salesByHour={salesByHour}
              revenueVsExpenses={revenueVsExpenses}
            />
            <TopProductsTable topProducts={topProducts} totalRevenue={totalRevenue} />
          </>
        )}
      </div>
    </section>
  );
}

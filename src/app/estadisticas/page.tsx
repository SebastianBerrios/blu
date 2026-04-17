"use client";

import { useMemo, useRef, useState } from "react";
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
import type { DateRangePreset } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import {
  KPIGrid,
  StatsChartsGrid,
  TopProductsTable,
  PeriodSelector,
  Heatmap,
  ExportButton,
  getPeriodRanges,
} from "@/features/estadisticas";
import type { KPIId } from "@/features/estadisticas/components/KPIGrid";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

export default function EstadisticasPage() {
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [custom, setCustom] = useState<{ startDate: string; endDate: string } | undefined>();

  const ranges = useMemo(
    () => getPeriodRanges(preset, anchor, custom),
    [preset, anchor, custom],
  );

  const {
    kpis,
    revenueByBucket,
    previousRevenueByBucket,
    revenueByMethod,
    topProducts,
    salesByOrderType,
    salesByHour,
    revenueVsExpenses,
    heatmap,
    sparkline,
    isLoading,
  } = useSalesStats(ranges);

  const totalRevenue = topProducts.reduce((sum, p) => sum + p.totalRevenue, 0);

  const trendRef = useRef<HTMLDivElement>(null);
  const topProductsRef = useRef<HTMLDivElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);

  const handleKpiClick = (id: KPIId) => {
    const target =
      id === "revenue" || id === "avgTicket" || id === "totalSales"
        ? trendRef.current
        : id === "productsSold"
        ? topProductsRef.current
        : marginRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Estadísticas"
        icon={<BarChart3 className="w-6 h-6 text-primary-700" />}
        action={
          <ExportButton
            disabled={isLoading}
            bundle={{
              ranges,
              kpis,
              revenueByBucket,
              revenueByMethod,
              topProducts,
              salesByOrderType,
              salesByHour,
              heatmap,
            }}
          />
        }
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto space-y-4 md:space-y-6">
        <PeriodSelector
          preset={preset}
          anchor={anchor}
          label={ranges.label}
          custom={custom}
          onPresetChange={(p) => {
            setPreset(p);
            if (p !== "custom") setCustom(undefined);
          }}
          onAnchorChange={setAnchor}
          onCustomChange={setCustom}
        />

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Cargando estadísticas...</div>
        ) : (
          <>
            <div ref={marginRef}>
              <KPIGrid
                kpis={kpis}
                sparkline={sparkline}
                previousLabel={ranges.previousLabel}
                onKpiClick={handleKpiClick}
              />
            </div>

            <div ref={trendRef}>
              <StatsChartsGrid
                revenueByBucket={revenueByBucket}
                previousRevenueByBucket={previousRevenueByBucket}
                revenueByMethod={revenueByMethod}
                topProducts={topProducts}
                salesByOrderType={salesByOrderType}
                salesByHour={salesByHour}
                revenueVsExpenses={revenueVsExpenses}
                granularity={ranges.granularity}
                previousLabel={ranges.previousLabel}
              />
            </div>

            <Heatmap data={heatmap} />

            <div ref={topProductsRef}>
              <TopProductsTable topProducts={topProducts} totalRevenue={totalRevenue} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

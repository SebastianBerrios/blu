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
import { SkeletonKpi, SkeletonChart } from "@/components/ui/Skeleton";
import {
  KPIGrid,
  StatsChartsGrid,
  TopProductsTable,
  PeriodSelector,
  Heatmap,
  ExportButton,
  getPeriodRanges,
  getDefaultComparisonAnchor,
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
  const [comparisonAnchor, setComparisonAnchor] = useState<Date | null>(null);

  const ranges = useMemo(
    () => getPeriodRanges(preset, anchor, custom, comparisonAnchor),
    [preset, anchor, custom, comparisonAnchor],
  );

  const currentLabel = useMemo<string>(() => {
    switch (preset) {
      case "today":
        return "Hoy";
      case "week":
        return "Semana";
      case "month":
        return "Mes";
      case "year":
        return "Año";
      default:
        return "Periodo";
    }
  }, [preset]);

  const {
    kpis,
    revenueByBucket,
    previousRevenueByBucket,
    revenueByMethod,
    topProducts,
    allProducts,
    salesByOrderType,
    salesByHour,
    revenueVsExpenses,
    heatmap,
    sparkline,
    isLoading,
  } = useSalesStats(ranges);

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
          comparisonLabel={ranges.previousLabel}
          comparisonAnchor={comparisonAnchor}
          defaultComparisonAnchor={getDefaultComparisonAnchor(preset, anchor, custom)}
          onPresetChange={(p) => {
            setPreset(p);
            setComparisonAnchor(null);
            if (p !== "custom") setCustom(undefined);
          }}
          onAnchorChange={(a) => {
            setAnchor(a);
            setComparisonAnchor(null);
          }}
          onCustomChange={(range) => {
            setCustom(range);
            setComparisonAnchor(null);
          }}
          onComparisonChange={setComparisonAnchor}
        />

        {isLoading ? (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonKpi key={i} />
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <SkeletonChart />
              <SkeletonChart />
            </div>
          </div>
        ) : (
          <>
            <div ref={marginRef}>
              <KPIGrid
                kpis={kpis}
                sparkline={sparkline}
                previousLabel={ranges.previousLabel}
                currentLabel={currentLabel}
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
              <TopProductsTable products={allProducts} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

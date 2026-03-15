"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, ShoppingBag, Receipt, DollarSign } from "lucide-react";
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
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useSalesStats } from "@/hooks/useSalesStats";
import type { DateRange, DateRangePreset } from "@/types";
import PageHeader from "@/components/ui/PageHeader";

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

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
];

function getDateRange(preset: DateRangePreset): DateRange {
  const end = new Date();
  const start = new Date();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10) + "T23:59:59",
    preset,
  };
}

export default function EstadisticasPage() {
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange("30d"));

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
        action={
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePresetChange(p.value)}
                className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                  preset === p.value
                    ? "bg-primary-100 text-primary-800 border-primary-300"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto space-y-4 md:space-y-6">
        {/* Mobile preset selector */}
        <div className="flex gap-2 md:hidden">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePresetChange(p.value)}
              className={`flex-1 px-3 py-3 rounded-lg border-2 font-medium text-sm transition-all min-h-[44px] ${
                preset === p.value
                  ? "bg-primary-100 text-primary-800 border-primary-300"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Cargando estadísticas...</div>
        ) : (
          <>
            {/* KPI Cards */}
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

            {/* Charts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="Tendencia de Ingresos">
                {revenueByDay.length > 0 ? (
                  <Line
                    data={{
                      labels: revenueByDay.map((d) => formatDate(d.date)),
                      datasets: [{
                        label: "Ingresos",
                        data: revenueByDay.map((d) => d.revenue),
                        borderColor: "#0369a1",
                        backgroundColor: "rgba(3, 105, 161, 0.1)",
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, ticks: { callback: (v) => `S/ ${v}` } } },
                    }}
                  />
                ) : <EmptyChart />}
              </ChartCard>

              <ChartCard title="Ingresos por Método de Pago">
                {revenueByMethod.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: revenueByMethod.map((d) => d.method),
                      datasets: [{
                        data: revenueByMethod.map((d) => d.total),
                        backgroundColor: ["#16a34a", "#7c3aed", "#4f46e5"],
                        borderWidth: 2,
                        borderColor: "#fff",
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                ) : <EmptyChart />}
              </ChartCard>

              <ChartCard title="Top Productos">
                {topProducts.length > 0 ? (
                  <Bar
                    data={{
                      labels: topProducts.map((p) => p.productName),
                      datasets: [{
                        label: "Ingresos",
                        data: topProducts.map((p) => p.totalRevenue),
                        backgroundColor: "#0369a1",
                        borderRadius: 4,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: "y",
                      plugins: { legend: { display: false } },
                      scales: { x: { beginAtZero: true, ticks: { callback: (v) => `S/ ${v}` } } },
                    }}
                  />
                ) : <EmptyChart />}
              </ChartCard>

              <ChartCard title="Ventas por Tipo de Pedido">
                {salesByOrderType.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: salesByOrderType.map((d) => d.orderType),
                      datasets: [{
                        data: salesByOrderType.map((d) => d.count),
                        backgroundColor: ["#2563eb", "#d97706", "#16a34a"],
                        borderWidth: 2,
                        borderColor: "#fff",
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                ) : <EmptyChart />}
              </ChartCard>

              <ChartCard title="Ventas por Hora del Día">
                {salesByHour.length > 0 ? (
                  <Bar
                    data={{
                      labels: salesByHour.map((d) => `${d.hour}:00`),
                      datasets: [{
                        label: "Ventas",
                        data: salesByHour.map((d) => d.count),
                        backgroundColor: "#d97706",
                        borderRadius: 4,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true } },
                    }}
                  />
                ) : <EmptyChart />}
              </ChartCard>

              <ChartCard title="Ingresos vs Gastos">
                {revenueVsExpenses.length > 0 ? (
                  <Line
                    data={{
                      labels: revenueVsExpenses.map((d) => formatDate(d.date)),
                      datasets: [
                        {
                          label: "Ingresos",
                          data: revenueVsExpenses.map((d) => d.revenue),
                          borderColor: "#16a34a",
                          backgroundColor: "rgba(22, 163, 74, 0.1)",
                          fill: true,
                          tension: 0.3,
                          pointRadius: 2,
                        },
                        {
                          label: "Gastos",
                          data: revenueVsExpenses.map((d) => d.expenses),
                          borderColor: "#dc2626",
                          backgroundColor: "rgba(220, 38, 38, 0.1)",
                          fill: true,
                          tension: 0.3,
                          pointRadius: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                      scales: { y: { beginAtZero: true, ticks: { callback: (v) => `S/ ${v}` } } },
                    }}
                  />
                ) : <EmptyChart />}
              </ChartCard>
            </div>

            {/* Top products table */}
            {topProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-base font-semibold text-slate-900">Top 10 Productos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Producto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Cantidad</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Ingresos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topProducts.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900 capitalize font-medium">{p.productName}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right">{p.quantitySold}</td>
                          <td className="px-4 py-3 text-sm text-green-700 text-right font-semibold">S/ {p.totalRevenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 text-right">
                            {totalRevenue > 0 ? ((p.totalRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function KPICard({
  icon,
  label,
  value,
  color,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  iconColor: string;
}) {
  return (
    <div className={`rounded-xl border-2 p-4 md:p-5 ${color}`}>
      <div className={`mb-2 ${iconColor}`}>{icon}</div>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-lg md:text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      <div className="h-64 md:h-72">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
      Sin datos para este período
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

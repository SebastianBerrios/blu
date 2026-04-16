"use client";

import { Line, Bar, Doughnut } from "react-chartjs-2";
import type {
  RevenueByDay,
  RevenueByPaymentMethod,
  TopProduct,
  SalesByOrderType,
  SalesByHour,
  RevenueVsExpenses,
} from "@/types";
import { formatDateChart } from "@/utils/helpers/dateFormatters";
import { CHART_COLORS } from "../constants";
import ChartCard from "./ChartCard";
import EmptyChart from "./EmptyChart";

interface StatsChartsGridProps {
  revenueByDay: RevenueByDay[];
  revenueByMethod: RevenueByPaymentMethod[];
  topProducts: TopProduct[];
  salesByOrderType: SalesByOrderType[];
  salesByHour: SalesByHour[];
  revenueVsExpenses: RevenueVsExpenses[];
}

export default function StatsChartsGrid({
  revenueByDay,
  revenueByMethod,
  topProducts,
  salesByOrderType,
  salesByHour,
  revenueVsExpenses,
}: StatsChartsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartCard title="Tendencia de Ingresos">
        {revenueByDay.length > 0 ? (
          <Line
            data={{
              labels: revenueByDay.map((d) => formatDateChart(d.date)),
              datasets: [{
                label: "Ingresos",
                data: revenueByDay.map((d) => d.revenue),
                borderColor: CHART_COLORS.primary,
                backgroundColor: CHART_COLORS.primaryFill,
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
                backgroundColor: [CHART_COLORS.green, CHART_COLORS.violet, CHART_COLORS.indigo],
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
                backgroundColor: CHART_COLORS.primary,
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
                backgroundColor: [CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.green],
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
                backgroundColor: CHART_COLORS.amber,
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
              labels: revenueVsExpenses.map((d) => formatDateChart(d.date)),
              datasets: [
                {
                  label: "Ingresos",
                  data: revenueVsExpenses.map((d) => d.revenue),
                  borderColor: CHART_COLORS.green,
                  backgroundColor: CHART_COLORS.greenFill,
                  fill: true,
                  tension: 0.3,
                  pointRadius: 2,
                },
                {
                  label: "Gastos",
                  data: revenueVsExpenses.map((d) => d.expenses),
                  borderColor: CHART_COLORS.red,
                  backgroundColor: CHART_COLORS.redFill,
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
  );
}

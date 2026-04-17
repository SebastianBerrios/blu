import type {
  SalesKPIsWithDelta,
  RevenueByDay,
  RevenueByPaymentMethod,
  TopProduct,
  SalesByOrderType,
  SalesByHour,
  HeatmapCell,
  PeriodRanges,
} from "@/types";

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCell).join(",");
}

export interface ExportBundle {
  ranges: PeriodRanges;
  kpis: SalesKPIsWithDelta;
  revenueByBucket: RevenueByDay[];
  revenueByMethod: RevenueByPaymentMethod[];
  topProducts: TopProduct[];
  salesByOrderType: SalesByOrderType[];
  salesByHour: SalesByHour[];
  heatmap: HeatmapCell[];
}

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function buildStatsCSV(bundle: ExportBundle): string {
  const { ranges, kpis, revenueByBucket, revenueByMethod, topProducts, salesByOrderType, salesByHour, heatmap } = bundle;
  const lines: string[] = [];

  lines.push("# Estadísticas Blu Café");
  lines.push(`Período,${escapeCell(ranges.label)}`);
  lines.push(`Rango,${ranges.current.start.slice(0, 10)} → ${ranges.current.end.slice(0, 10)}`);
  lines.push(`Comparado con,${escapeCell(ranges.previousLabel)}`);
  lines.push("");

  lines.push("## KPIs");
  lines.push(toRow(["Métrica", "Actual", "Anterior", "Delta %"]));
  lines.push(toRow(["Ingresos", kpis.revenue.current.toFixed(2), kpis.revenue.previous.toFixed(2), kpis.revenue.deltaPct?.toFixed(1) ?? "—"]));
  lines.push(toRow(["Ticket Promedio", kpis.avgTicket.current.toFixed(2), kpis.avgTicket.previous.toFixed(2), kpis.avgTicket.deltaPct?.toFixed(1) ?? "—"]));
  lines.push(toRow(["Total Ventas", kpis.totalSales.current, kpis.totalSales.previous, kpis.totalSales.deltaPct?.toFixed(1) ?? "—"]));
  lines.push(toRow(["Productos Vendidos", kpis.productsSold.current, kpis.productsSold.previous, kpis.productsSold.deltaPct?.toFixed(1) ?? "—"]));
  lines.push(toRow(["Margen Bruto", kpis.grossMargin.current.toFixed(2), kpis.grossMargin.previous.toFixed(2), kpis.grossMargin.deltaPct?.toFixed(1) ?? "—"]));
  lines.push(toRow(["Margen %", kpis.grossMarginPct.current.toFixed(1), kpis.grossMarginPct.previous.toFixed(1), kpis.grossMarginPct.deltaPct?.toFixed(1) ?? "—"]));
  lines.push("");

  lines.push("## Tendencia de Ingresos");
  lines.push(toRow(["Bucket", "Ingresos"]));
  for (const row of revenueByBucket) lines.push(toRow([row.date, row.revenue.toFixed(2)]));
  lines.push("");

  lines.push("## Ingresos por Método de Pago");
  lines.push(toRow(["Método", "Total"]));
  for (const row of revenueByMethod) lines.push(toRow([row.method, row.total.toFixed(2)]));
  lines.push("");

  lines.push("## Top Productos");
  lines.push(toRow(["Producto", "Cantidad", "Ingresos"]));
  for (const row of topProducts) lines.push(toRow([row.productName, row.quantitySold, row.totalRevenue.toFixed(2)]));
  lines.push("");

  lines.push("## Ventas por Tipo de Pedido");
  lines.push(toRow(["Tipo", "Cantidad", "Ingresos"]));
  for (const row of salesByOrderType) lines.push(toRow([row.orderType, row.count, row.revenue.toFixed(2)]));
  lines.push("");

  lines.push("## Ventas por Hora");
  lines.push(toRow(["Hora", "Cantidad", "Ingresos"]));
  for (const row of salesByHour) lines.push(toRow([`${row.hour}:00`, row.count, row.revenue.toFixed(2)]));
  lines.push("");

  lines.push("## Heatmap Día × Hora");
  lines.push(toRow(["Día", "Hora", "Ventas", "Ingresos"]));
  for (const c of heatmap) {
    lines.push(toRow([DAY_LABELS[c.dayOfWeek], `${c.hour}:00`, c.count, c.revenue.toFixed(2)]));
  }

  return lines.join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

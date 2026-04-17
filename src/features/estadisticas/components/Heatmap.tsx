"use client";

import { useMemo } from "react";
import type { HeatmapCell } from "@/types";
import ChartCard from "./ChartCard";
import EmptyChart from "./EmptyChart";

interface HeatmapProps {
  data: HeatmapCell[];
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const OPENING_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 → 22:00

function colorFor(intensity: number): string {
  if (intensity === 0) return "bg-slate-100";
  if (intensity < 0.2) return "bg-primary-100";
  if (intensity < 0.4) return "bg-primary-200";
  if (intensity < 0.6) return "bg-primary-400";
  if (intensity < 0.8) return "bg-primary-600";
  return "bg-primary-800";
}

function textColorFor(intensity: number): string {
  return intensity >= 0.6 ? "text-white" : "text-slate-700";
}

export default function Heatmap({ data }: HeatmapProps) {
  const { matrix, max, peakCell } = useMemo(() => {
    const m: Record<string, { count: number; revenue: number }> = {};
    let mx = 0;
    let peak: { dow: number; hour: number; count: number; revenue: number } | null = null;
    for (const c of data) {
      const key = `${c.dayOfWeek}-${c.hour}`;
      m[key] = { count: c.count, revenue: c.revenue };
      if (c.count > mx) {
        mx = c.count;
        peak = { dow: c.dayOfWeek, hour: c.hour, count: c.count, revenue: c.revenue };
      }
    }
    return { matrix: m, max: mx, peakCell: peak };
  }, [data]);

  return (
    <ChartCard title="Heatmap — Día × Hora" subtitle={peakCell ? peakHint(peakCell) : undefined}>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full border-separate" style={{ borderSpacing: "3px" }}>
              <thead>
                <tr>
                  <th className="text-[10px] font-medium text-slate-500 px-1 text-left"></th>
                  {OPENING_HOURS.map((h) => (
                    <th
                      key={h}
                      className="text-[10px] font-medium text-slate-500 px-0.5 text-center tabular-nums"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_LABELS.map((dayLabel, dow) => (
                  <tr key={dow}>
                    <td className="text-[11px] font-medium text-slate-600 pr-2 py-1">
                      {dayLabel}
                    </td>
                    {OPENING_HOURS.map((h) => {
                      const cell = matrix[`${dow}-${h}`];
                      const count = cell?.count ?? 0;
                      const intensity = max > 0 ? count / max : 0;
                      return (
                        <td
                          key={h}
                          title={
                            count > 0
                              ? `${dayLabel} ${h}:00 · ${count} venta${count === 1 ? "" : "s"} · S/ ${cell!.revenue.toFixed(2)}`
                              : `${dayLabel} ${h}:00 · sin ventas`
                          }
                          className={`${colorFor(intensity)} ${textColorFor(intensity)} text-[10px] font-semibold text-center rounded min-w-[22px] h-6 tabular-nums transition-colors hover:opacity-80`}
                        >
                          {count || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
            <span>Menos</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((i) => (
              <span key={i} className={`w-3 h-3 rounded ${colorFor(i)}`} />
            ))}
            <span>Más</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function peakHint(peak: { dow: number; hour: number; count: number }): string {
  return `Pico: ${DAY_LABELS[peak.dow]} ${peak.hour}:00 · ${peak.count} ventas`;
}

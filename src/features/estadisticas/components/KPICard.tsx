"use client";

import type { ReactNode } from "react";
import type { KPIValue } from "@/types";
import { KPI_ACCENT_STYLES, type KPIAccent } from "@/utils/constants/accentPalette";
import Sparkline from "./Sparkline";

interface KPICardProps {
  icon: ReactNode;
  label: string;
  value: string;
  kpi: KPIValue;
  currentLabel: string;
  previousLabel?: string;
  sparkline?: number[];
  accent: KPIAccent;
  onClick?: () => void;
  invertDelta?: boolean;
  formatPrevious?: (v: number) => string;
}

export default function KPICard({
  icon,
  label,
  value,
  kpi,
  currentLabel,
  previousLabel,
  sparkline,
  accent,
  onClick,
  invertDelta = false,
  formatPrevious,
}: KPICardProps) {
  const palette = KPI_ACCENT_STYLES[accent];
  const delta = kpi.deltaPct;
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;
  const isFlat = delta === 0 || delta === null;

  // invertDelta: for "menos es mejor" metrics (like costs). Default: more is good.
  const goodDirection = invertDelta ? isNegative : isPositive;
  const badDirection = invertDelta ? isPositive : isNegative;

  const deltaTextColor = isFlat
    ? "text-slate-500"
    : goodDirection
    ? "text-emerald-600"
    : badDirection
    ? "text-red-600"
    : "text-slate-500";

  const deltaText =
    delta === null || delta === 0
      ? "0%"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;

  const prevFormatted =
    formatPrevious?.(kpi.previous) ?? kpi.previous.toFixed(2);

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`group rounded-xl border-2 p-3.5 md:p-4 text-left transition-all ${palette.bg} ${palette.border} ${
        onClick ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`${palette.icon}`}>{icon}</div>
        {sparkline && sparkline.length > 0 && (
          <div className="opacity-80 group-hover:opacity-100 transition-opacity">
            <Sparkline
              values={sparkline}
              stroke={palette.spark}
              fill={palette.sparkFill}
              width={64}
              height={22}
            />
          </div>
        )}
      </div>
      <p className={`text-[11px] md:text-xs font-medium mt-2 ${palette.text} opacity-75`}>
        {label}
      </p>

      {/* Current period amount */}
      <div className="mt-1 flex items-baseline justify-between gap-1 whitespace-nowrap">
        <span className={`text-[11px] font-medium ${palette.text} opacity-60`}>
          {currentLabel}
        </span>
        <span className={`text-lg md:text-2xl font-bold tabular-nums ${palette.text}`}>
          {value}
        </span>
      </div>

      {/* Compared period amount + delta */}
      <div className="mt-0.5 flex items-baseline justify-between gap-1 whitespace-nowrap">
        <span className="text-[10px] font-medium text-slate-500">Antes</span>
        <span className="text-[11px] font-semibold tabular-nums text-slate-600">
          {prevFormatted}
          {delta !== null && (
            <span className={`ml-1 ${deltaTextColor}`}>({deltaText})</span>
          )}
        </span>
      </div>

      {/* Compared period label */}
      {previousLabel && (
        <p className="mt-1.5 text-[10px] text-slate-500 capitalize">vs {previousLabel}</p>
      )}
    </Wrapper>
  );
}

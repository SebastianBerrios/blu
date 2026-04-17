"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { KPIValue } from "@/types";
import Sparkline from "./Sparkline";

interface KPICardProps {
  icon: ReactNode;
  label: string;
  value: string;
  kpi: KPIValue;
  previousLabel?: string;
  sparkline?: number[];
  accent: "green" | "blue" | "purple" | "amber" | "primary" | "emerald";
  onClick?: () => void;
  invertDelta?: boolean;
  formatPrevious?: (v: number) => string;
}

const ACCENT_STYLES: Record<
  Required<KPICardProps>["accent"],
  { bg: string; border: string; text: string; icon: string; spark: string; sparkFill: string }
> = {
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-600",
    spark: "#16a34a",
    sparkFill: "rgba(22,163,74,0.15)",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-600",
    spark: "#2563eb",
    sparkFill: "rgba(37,99,235,0.15)",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    icon: "text-purple-600",
    spark: "#7c3aed",
    sparkFill: "rgba(124,58,237,0.15)",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-600",
    spark: "#d97706",
    sparkFill: "rgba(217,119,6,0.15)",
  },
  primary: {
    bg: "bg-primary-50",
    border: "border-primary-200",
    text: "text-primary-800",
    icon: "text-primary-600",
    spark: "#0369a1",
    sparkFill: "rgba(3,105,161,0.15)",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    icon: "text-emerald-600",
    spark: "#059669",
    sparkFill: "rgba(5,150,105,0.15)",
  },
};

export default function KPICard({
  icon,
  label,
  value,
  kpi,
  previousLabel,
  sparkline,
  accent,
  onClick,
  invertDelta = false,
  formatPrevious,
}: KPICardProps) {
  const palette = ACCENT_STYLES[accent];
  const delta = kpi.deltaPct;
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;
  const isFlat = delta === 0 || delta === null;

  // invertDelta: for "menos es mejor" metrics (like costs). Default: more is good.
  const goodDirection = invertDelta ? isNegative : isPositive;
  const badDirection = invertDelta ? isPositive : isNegative;

  const deltaColor = isFlat
    ? "text-slate-400 bg-slate-100"
    : goodDirection
    ? "text-emerald-700 bg-emerald-50"
    : badDirection
    ? "text-red-700 bg-red-50"
    : "text-slate-400 bg-slate-100";

  const DeltaIcon = isFlat ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

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
      <p className={`text-lg md:text-2xl font-bold mt-0.5 tabular-nums ${palette.text}`}>
        {value}
      </p>
      <div className="mt-2 flex items-center gap-1.5 min-h-[22px]">
        {delta !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${deltaColor}`}
          >
            <DeltaIcon className="w-3 h-3" />
            {isFlat
              ? "0%"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          </span>
        )}
        {previousLabel && (
          <span className="text-[10px] text-slate-500 truncate">
            vs {previousLabel}
            {kpi.previous > 0 && (
              <>
                {" · "}
                <span className="tabular-nums">{prevFormatted}</span>
              </>
            )}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

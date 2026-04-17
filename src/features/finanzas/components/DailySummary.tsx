"use client";

import { useRef } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Edit3,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useDailyFinancialSummary } from "@/hooks/useDailyFinancialSummary";
import { toLocalDateKey } from "@/utils/helpers/groupByDate";
import { formatDateLong } from "@/utils/helpers/dateFormatters";
import type { DailyAlert, DailyAlertType } from "@/features/finanzas";

interface DailySummaryProps {
  date: string;
  onDateChange: (date: string) => void;
}

const ALERT_STYLE: Record<DailyAlertType, { color: string; Icon: typeof Info }> = {
  cash_change: { color: "border-amber-200 bg-amber-50 text-amber-800", Icon: Coins },
  sale_edited: { color: "border-indigo-200 bg-indigo-50 text-indigo-800", Icon: Edit3 },
  yape_change: { color: "border-purple-200 bg-purple-50 text-purple-800", Icon: Coins },
  manual_adjustment: {
    color: "border-orange-200 bg-orange-50 text-orange-800",
    Icon: AlertTriangle,
  },
};

function shiftDate(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d.toISOString());
}

export default function DailySummary({ date, onDateChange }: DailySummaryProps) {
  const today = toLocalDateKey(new Date().toISOString());
  const { summary, isLoading } = useDailyFinancialSummary(date);
  const isToday = date === today;
  const isFuture = date > today;
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    // showPicker is supported in modern browsers; fallback to focus+click
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 space-y-4 shadow-sm">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDateChange(shiftDate(date, -1))}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Día anterior"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => onDateChange(shiftDate(date, 1))}
            disabled={isToday || isFuture}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Día siguiente"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
            Resumen del día
          </p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <h3 className="text-base md:text-lg font-semibold text-slate-900 truncate">
              {formatDateLong(date)}
            </h3>
            {isToday && (
              <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full">
                Hoy
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={openDatePicker}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Elegir fecha"
            title="Elegir fecha"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
          />
        </div>
      </div>

      {isLoading || !summary ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          Cargando resumen...
        </div>
      ) : (
        <>
          {/* Per-account breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.perAccount.map((a) => {
              const isCaja = a.accountType === "caja";
              const Icon = isCaja ? Banknote : Building2;
              const accent = isCaja
                ? { border: "border-green-200", bg: "bg-green-50/60", icon: "text-green-700", chip: "bg-green-100 text-green-800" }
                : { border: "border-blue-200", bg: "bg-blue-50/60", icon: "text-blue-700", chip: "bg-blue-100 text-blue-800" };

              return (
                <div
                  key={a.accountId}
                  className={`border rounded-xl p-3.5 space-y-2.5 ${accent.border} ${accent.bg}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${accent.icon}`} />
                      <span className="text-sm font-semibold text-slate-900">
                        {a.accountName}
                      </span>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${accent.chip}`}>
                      {isCaja ? "Caja" : "Banco"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-green-700">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="tabular-nums font-medium">+S/ {a.ingresos.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-700">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span className="tabular-nums font-medium">−S/ {a.egresos.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                    <div className="text-xs text-slate-500">
                      <span>Neto: </span>
                      <span
                        className={`font-semibold tabular-nums ${
                          a.net >= 0 ? "text-slate-900" : "text-red-700"
                        }`}
                      >
                        {a.net >= 0 ? "+" : ""}S/ {a.net.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span>Cierre: </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        S/ {a.closingBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm border-t border-slate-100 pt-3">
            <span className="text-slate-500">Total día:</span>
            <span className="text-green-700 font-medium tabular-nums">
              +S/ {summary.totalIngresos.toFixed(2)}
            </span>
            <span className="text-red-700 font-medium tabular-nums">
              −S/ {summary.totalEgresos.toFixed(2)}
            </span>
            <span
              className={`ml-auto font-semibold tabular-nums ${
                summary.totalNet >= 0 ? "text-slate-900" : "text-red-700"
              }`}
            >
              Neto: {summary.totalNet >= 0 ? "+" : ""}S/ {summary.totalNet.toFixed(2)}
            </span>
          </div>

          {/* Alerts */}
          {summary.alerts.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alertas ({summary.alerts.length})
              </h4>
              <div className="space-y-1.5">
                {summary.alerts.map((a) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium">Sin alertas para este día</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AlertRow({ alert }: { alert: DailyAlert }) {
  const { color, Icon } = ALERT_STYLE[alert.type];
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${color}`}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{alert.message}</p>
        {alert.detail && <p className="opacity-80 mt-0.5">{alert.detail}</p>}
      </div>
      {alert.amount !== undefined && (
        <span className="font-semibold whitespace-nowrap tabular-nums">
          S/ {alert.amount.toFixed(2)}
        </span>
      )}
    </div>
  );
}

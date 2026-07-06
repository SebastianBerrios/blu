"use client";

import type { LucideIcon } from "lucide-react";
import { MinusCircle, PlusCircle } from "lucide-react";
import { BALANCE_ACCENT_STYLES, type BalanceAccent } from "@/utils/constants/accentPalette";

export interface BalanceCardProps {
  label: string;
  balance: number;
  Icon: LucideIcon;
  accent: BalanceAccent;
  onExpense?: () => void;
  onIncome?: () => void;
}

export default function BalanceCard({
  label,
  balance,
  Icon,
  accent,
  onExpense,
  onIncome,
}: BalanceCardProps) {
  const isNeg = balance < 0;
  const palette = BALANCE_ACCENT_STYLES[accent];

  return (
    <div
      className={`rounded-xl border-2 p-4 md:p-5 shadow-sm ${
        isNeg ? "border-red-300 bg-red-50" : `${palette.border} ${palette.bg}`
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${isNeg ? "text-red-700" : palette.icon}`} />
          <span className={`text-sm font-semibold ${isNeg ? "text-red-800" : palette.label}`}>
            {label}
          </span>
        </div>
        {isNeg && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
            Negativo
          </span>
        )}
      </div>
      <p
        className={`text-2xl md:text-3xl font-bold tabular-nums ${
          isNeg ? "text-red-700" : palette.value
        }`}
      >
        S/ {balance.toFixed(2)}
      </p>
      {(onExpense || onIncome) && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {onExpense ? (
            <button
              onClick={onExpense}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium bg-white/90 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors min-h-[44px] active:scale-[0.97]"
            >
              <MinusCircle className="w-4 h-4" />
              Gasto
            </button>
          ) : (
            <span />
          )}
          {onIncome ? (
            <button
              onClick={onIncome}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium bg-white/90 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors min-h-[44px] active:scale-[0.97]"
            >
              <PlusCircle className="w-4 h-4" />
              Ingreso
            </button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

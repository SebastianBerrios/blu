"use client";

import type { TransactionWithUser } from "@/types";

export interface TransactionRowProps {
  transaction: TransactionWithUser;
  typeInfo: { label: string; color: string };
  accentBar: string;
}

export default function TransactionRow({ transaction: t, typeInfo, accentBar }: TransactionRowProps) {
  const isPositive = t.amount > 0;

  return (
    <div
      className="flex items-stretch gap-3 px-3 md:px-4 py-3 hover:bg-slate-50/60 transition-colors"
    >
      <span
        className={`shrink-0 w-1 rounded-full ${accentBar}`}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          {t.category_name && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
              {t.category_name}
            </span>
          )}
          <span className="text-[11px] text-slate-500 tabular-nums">
            {new Date(t.created_at).toLocaleTimeString("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {t.description && (
          <p className="text-sm text-slate-700 truncate">{t.description}</p>
        )}
        {t.user_name && (
          <p className="text-[11px] text-slate-500 mt-0.5">por {t.user_name}</p>
        )}
      </div>
      <span
        className={`self-center text-sm font-bold whitespace-nowrap tabular-nums ${
          isPositive ? "text-green-700" : "text-red-700"
        }`}
      >
        {isPositive ? "+" : ""}S/ {Math.abs(t.amount).toFixed(2)}
      </span>
    </div>
  );
}

"use client";

import type { TransactionWithUser } from "@/types";
import TransactionRow from "./TransactionRow";

export interface TransactionDateGroupProps {
  date: string;
  transactions: TransactionWithUser[];
  resolveTypeInfo: (t: TransactionWithUser) => { label: string; color: string };
  resolveAccentBar: (t: TransactionWithUser) => string;
}

export default function TransactionDateGroup({
  date,
  transactions,
  resolveTypeInfo,
  resolveAccentBar,
}: TransactionDateGroupProps) {
  return (
    <div>
      <h3 className="text-xs md:text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
        {new Date(date + "T12:00:00").toLocaleDateString("es-PE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </h3>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
        {transactions.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            typeInfo={resolveTypeInfo(t)}
            accentBar={resolveAccentBar(t)}
          />
        ))}
      </div>
    </div>
  );
}

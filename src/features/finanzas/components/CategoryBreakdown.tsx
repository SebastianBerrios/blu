"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp, PieChart } from "lucide-react";
import type { TransactionWithUser } from "@/types";

interface CategoryBreakdownProps {
  transactions: TransactionWithUser[];
}

interface Bucket {
  name: string;
  total: number;
}

/**
 * Agrupa client-side las transacciones ya cargadas por categoría y muestra
 * los totales de ingresos y egresos por categoría. Solo considera transacciones
 * con categoría (gasto / ingreso_extra manuales).
 */
export default function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
  const { ingresos, egresos } = useMemo(() => {
    const ingresoMap = new Map<string, number>();
    const egresoMap = new Map<string, number>();

    for (const t of transactions) {
      if (!t.category_name) continue;
      const map = t.amount >= 0 ? ingresoMap : egresoMap;
      map.set(t.category_name, (map.get(t.category_name) ?? 0) + Math.abs(t.amount));
    }

    const toSorted = (m: Map<string, number>): Bucket[] =>
      [...m.entries()]
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    return { ingresos: toSorted(ingresoMap), egresos: toSorted(egresoMap) };
  }, [transactions]);

  if (ingresos.length === 0 && egresos.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-slate-500" />
        Resumen por categoría
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BucketList
          title="Ingresos"
          buckets={ingresos}
          Icon={TrendingUp}
          accent="text-green-700"
          sign="+"
        />
        <BucketList
          title="Egresos"
          buckets={egresos}
          Icon={TrendingDown}
          accent="text-red-700"
          sign="−"
        />
      </div>
    </div>
  );
}

interface BucketListProps {
  title: string;
  buckets: Bucket[];
  Icon: typeof TrendingUp;
  accent: string;
  sign: string;
}

function BucketList({ title, buckets, Icon, accent, sign }: BucketListProps) {
  const total = buckets.reduce((sum, b) => sum + b.total, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
        <span className={`text-xs font-semibold flex items-center gap-1.5 ${accent}`}>
          <Icon className="w-3.5 h-3.5" />
          {title}
        </span>
        <span className={`text-xs font-bold tabular-nums ${accent}`}>
          {sign}S/ {total.toFixed(2)}
        </span>
      </div>
      {buckets.length === 0 ? (
        <p className="text-xs text-slate-400 py-1">Sin movimientos</p>
      ) : (
        <ul className="space-y-1">
          {buckets.map((b) => (
            <li key={b.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-600 truncate">{b.name}</span>
              <span className={`tabular-nums font-medium ${accent}`}>
                {sign}S/ {b.total.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

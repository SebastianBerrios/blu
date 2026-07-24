"use client";

import type { TransactionCategory, TransactionType } from "@/types";
import { accountMeta } from "./accountMeta";

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  ...(["caja", "banco", "rappi", "pos"] as const).map((t) => ({
    value: t,
    label: accountMeta(t).shortLabel,
  })),
];

export interface TransactionFiltersProps {
  typeLabels: Record<string, { label: string; color: string }>;
  accountFilter: string;
  onAccountFilterChange: (value: string) => void;
  typeFilter: TransactionType | "";
  onTypeFilterChange: (value: TransactionType | "") => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  ingresoCategories: TransactionCategory[];
  egresoCategories: TransactionCategory[];
}

export default function TransactionFilters({
  typeLabels,
  accountFilter,
  onAccountFilterChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  ingresoCategories,
  egresoCategories,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onAccountFilterChange(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              accountFilter === opt.value
                ? "bg-primary-100 text-primary-800"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value as TransactionType | "")}
        className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm"
      >
        <option value="">Todos los tipos</option>
        {Object.entries(typeLabels).map(([value, { label }]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {(ingresoCategories.length > 0 || egresoCategories.length > 0) && (
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm"
        >
          <option value="">Todas las categorías</option>
          {ingresoCategories.length > 0 && (
            <optgroup label="Ingresos">
              {ingresoCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          )}
          {egresoCategories.length > 0 && (
            <optgroup label="Egresos">
              {egresoCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      )}
    </div>
  );
}

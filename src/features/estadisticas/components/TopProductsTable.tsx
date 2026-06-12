"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import type { TopProduct } from "@/types";

type SortKey = "quantitySold" | "totalRevenue";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

interface TopProductsTableProps {
  products: TopProduct[];
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalRevenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...products].sort((a, b) => (a[sortKey] - b[sortKey]) * dir);
  }, [products, sortKey, sortDir]);

  const visible = sorted.slice(0, visibleCount);
  const visibleSum = visible.reduce((sum, p) => sum + p.totalRevenue, 0);

  if (products.length === 0) return null;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (column !== sortKey) return null;
    const Icon = sortDir === "asc" ? ArrowUp : ArrowDown;
    return <Icon className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />;
  };

  const allShown = visibleCount >= products.length;
  const remaining = products.length - visibleCount;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-base font-semibold text-slate-900">Productos</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Producto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                <button
                  type="button"
                  onClick={() => handleSort("quantitySold")}
                  className="inline-flex items-center uppercase hover:text-slate-900 transition-colors"
                >
                  Cantidad
                  <SortIcon column="quantitySold" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                <button
                  type="button"
                  onClick={() => handleSort("totalRevenue")}
                  className="inline-flex items-center uppercase hover:text-slate-900 transition-colors"
                >
                  Ingresos
                  <SortIcon column="totalRevenue" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                <button
                  type="button"
                  onClick={() => handleSort("totalRevenue")}
                  className="inline-flex items-center uppercase hover:text-slate-900 transition-colors"
                >
                  % del Total
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-900 capitalize font-medium">{p.productName}</td>
                <td className="px-4 py-3 text-sm text-slate-700 text-right">{p.quantitySold}</td>
                <td className="px-4 py-3 text-sm text-green-700 text-right font-semibold">S/ {p.totalRevenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">
                  {visibleSum > 0 ? ((p.totalRevenue / visibleSum) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() =>
            allShown
              ? setVisibleCount(PAGE_SIZE)
              : setVisibleCount((c) => Math.min(c + PAGE_SIZE, products.length))
          }
          className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-t border-slate-200 text-sm font-medium text-primary-700 hover:bg-slate-50 transition-colors"
        >
          {allShown ? (
            <>
              Ver menos
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Ver más ({remaining})
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

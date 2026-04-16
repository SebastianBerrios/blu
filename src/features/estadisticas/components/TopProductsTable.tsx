"use client";

import type { TopProduct } from "@/types";

interface TopProductsTableProps {
  topProducts: TopProduct[];
  totalRevenue: number;
}

export default function TopProductsTable({
  topProducts,
  totalRevenue,
}: TopProductsTableProps) {
  if (topProducts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-base font-semibold text-slate-900">Top 10 Productos</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Producto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Cantidad</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Ingresos</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">% del Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topProducts.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-900 capitalize font-medium">{p.productName}</td>
                <td className="px-4 py-3 text-sm text-slate-700 text-right">{p.quantitySold}</td>
                <td className="px-4 py-3 text-sm text-green-700 text-right font-semibold">S/ {p.totalRevenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">
                  {totalRevenue > 0 ? ((p.totalRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

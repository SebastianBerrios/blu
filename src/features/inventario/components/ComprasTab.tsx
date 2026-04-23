"use client";

import { useMemo } from "react";
import { ShoppingCart, Check } from "lucide-react";
import type { Ingredient, IngredientGroup } from "@/types";
import { groupIngredientsByGroup } from "../utils/groupIngredients";

const ComprasColGroup = () => (
  <colgroup>
    <col />
    <col style={{ width: "140px" }} />
    <col style={{ width: "100px" }} />
    <col style={{ width: "140px" }} />
  </colgroup>
);

function getStockColor(quantity: number, unit: string) {
  const thresholds: Record<string, number> = {
    kg: 0.5, g: 200, l: 0.5, ml: 200, und: 5, unidad: 5,
  };
  const threshold = thresholds[unit.toLowerCase()] ?? 0.1;
  if (quantity <= 0) return "text-red-600 bg-red-50 border-red-200";
  if (quantity <= threshold) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}

interface ComprasTabProps {
  ingredients: Ingredient[];
  groups: IngredientGroup[];
  onUnmark: (ingredient: Ingredient) => void;
}

export default function ComprasTab({ ingredients, groups, onUnmark }: ComprasTabProps) {
  const purchaseItems = useMemo(
    () => ingredients.filter((i) => i.needs_purchase),
    [ingredients],
  );

  const grouped = useMemo(
    () => groupIngredientsByGroup(purchaseItems, groups),
    [purchaseItems, groups],
  );

  if (purchaseItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <ShoppingCart className="w-10 h-10 mb-2" />
        <p className="text-sm">No hay ingredientes marcados para comprar</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block space-y-4">
        {grouped.map((section) => (
          <div key={section.group?.id ?? "ungrouped"} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">
                {section.group?.name ?? "Sin grupo"}
              </h3>
            </div>
            <table className="w-full text-sm table-fixed">
              <ComprasColGroup />
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Ingrediente</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500 text-xs">Stock actual</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Unidad</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500 text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {section.ingredients.map((ingredient) => {
                  const colorClass = getStockColor(ingredient.stock_quantity, ingredient.unit_of_measure);
                  return (
                    <tr key={ingredient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 capitalize truncate">
                        {ingredient.name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded border text-sm font-semibold ${colorClass}`}>
                          {ingredient.stock_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{ingredient.unit_of_measure}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onUnmark(ingredient)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 hover:bg-emerald-50 rounded transition-colors"
                          title="Marcar como comprado"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Comprado
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {grouped.map((section) => (
          <div key={section.group?.id ?? "ungrouped"}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {section.group?.name ?? "Sin grupo"}
            </h3>
            <div className="space-y-2">
              {section.ingredients.map((ingredient) => {
                const colorClass = getStockColor(ingredient.stock_quantity, ingredient.unit_of_measure);
                return (
                  <div
                    key={ingredient.id}
                    className="bg-white rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-medium text-slate-900 capitalize truncate">{ingredient.name}</p>
                        <span className={`shrink-0 inline-block px-2 py-0.5 rounded border text-sm font-semibold ${colorClass}`}>
                          {ingredient.stock_quantity} {ingredient.unit_of_measure}
                        </span>
                      </div>
                      <button
                        onClick={() => onUnmark(ingredient)}
                        className="shrink-0 ml-2 p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Marcar como comprado"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

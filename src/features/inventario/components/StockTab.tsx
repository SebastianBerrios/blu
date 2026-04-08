"use client";

import { useState, useMemo } from "react";
import { Package, Check, X, ArrowUpDown } from "lucide-react";
import type { Ingredient } from "@/types";

const LOW_STOCK_THRESHOLD = 0.1;

function getStockColor(quantity: number, unit: string) {
  const thresholds: Record<string, number> = {
    kg: 0.5,
    g: 200,
    l: 0.5,
    ml: 200,
    und: 5,
    unidad: 5,
  };
  const threshold = thresholds[unit.toLowerCase()] ?? LOW_STOCK_THRESHOLD;
  if (quantity <= 0) return "text-red-600 bg-red-50 border-red-200";
  if (quantity <= threshold) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}

interface EditingState {
  ingredientId: number;
  value: string;
}

interface StockTabProps {
  ingredients: Ingredient[];
  editing: EditingState | null;
  saving: boolean;
  onStartEdit: (i: Ingredient) => void;
  onCancelEdit: () => void;
  onSaveEdit: (i: Ingredient) => void;
  onEditChange: (val: string) => void;
}

export default function StockTab({
  ingredients,
  editing,
  saving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
}: StockTabProps) {
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");

  const sortedIngredients = useMemo(() => {
    if (sortOrder === "none") return ingredients;
    return [...ingredients].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "es");
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [ingredients, sortOrder]);

  const cycleSortOrder = () => {
    setSortOrder((prev) =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
    );
  };

  if (ingredients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <Package className="w-10 h-10 mb-2" />
        <p className="text-sm">No hay ingredientes registrados</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile sort button */}
      <div className="md:hidden flex justify-end mb-2">
        <button
          onClick={cycleSortOrder}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
            sortOrder !== "none"
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>
            {sortOrder === "asc" ? "A-Z" : sortOrder === "desc" ? "Z-A" : "Ordenar"}
          </span>
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ingrediente</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Cantidad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Unidad</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ingredients.map((ingredient) => {
              const isEditing = editing?.ingredientId === ingredient.id;
              const colorClass = getStockColor(ingredient.quantity, ingredient.unit_of_measure);

              return (
                <tr key={ingredient.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 capitalize">
                    {ingredient.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editing.value}
                        onChange={(e) => onEditChange(e.target.value)}
                        autoFocus
                        className="w-28 px-2 py-1 border-2 border-primary-400 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded border text-sm font-semibold ${colorClass}`}>
                        {ingredient.quantity}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{ingredient.unit_of_measure}</td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSaveEdit(ingredient)}
                          disabled={saving}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                          title="Confirmar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={onCancelEdit}
                          disabled={saving}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onStartEdit(ingredient)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 hover:bg-primary-50 rounded"
                      >
                        Ajustar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sortedIngredients.map((ingredient) => {
          const isEditing = editing?.ingredientId === ingredient.id;
          const colorClass = getStockColor(ingredient.quantity, ingredient.unit_of_measure);

          return (
            <div
              key={ingredient.id}
              className="bg-white rounded-xl border border-slate-200 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900 capitalize">{ingredient.name}</p>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editing.value}
                      onChange={(e) => onEditChange(e.target.value)}
                      autoFocus
                      className="w-24 px-2 py-1 border-2 border-primary-400 rounded-lg text-right focus:outline-none"
                    />
                    <button
                      onClick={() => onSaveEdit(ingredient)}
                      disabled={saving}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onCancelEdit}
                      disabled={saving}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded border text-sm font-semibold ${colorClass}`}>
                      {ingredient.quantity} {ingredient.unit_of_measure}
                    </span>
                    <button
                      onClick={() => onStartEdit(ingredient)}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 hover:bg-primary-50 rounded"
                    >
                      Ajustar
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

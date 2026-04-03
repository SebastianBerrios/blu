"use client";

import { Trash2, SquarePen } from "lucide-react";
import type { RecipeIngredientLine } from "../types";

interface IngredientListProps {
  ingredients: RecipeIngredientLine[];
  onEdit: (item: RecipeIngredientLine) => void;
  onRemove: (ingredientId: number) => void;
  hidePrice?: boolean;
  totalCost: number;
  isSubmitting: boolean;
}

export default function IngredientList({
  ingredients,
  onEdit,
  onRemove,
  hidePrice,
  totalCost,
  isSubmitting,
}: IngredientListProps) {
  if (ingredients.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-slate-900 mb-2">
        Ingredientes agregados ({ingredients.length})
      </h3>

      {/* Mobile card list */}
      <div className="space-y-2 md:hidden">
        {ingredients.map((item) => (
          <div
            key={item.ingredient_id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 capitalize truncate">
                {item.ingredient_name}
              </p>
              <p className="text-xs text-slate-500">
                {item.quantity} {item.unit_of_measure}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-3">
              {!hidePrice && (
                <span className="text-sm font-semibold text-green-600">
                  S/ {item.equivalent_price?.toFixed(2) || "0.00"}
                </span>
              )}
              <button
                type="button"
                onClick={() => onEdit(item)}
                disabled={isSubmitting}
                className="p-2.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <SquarePen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.ingredient_id)}
                disabled={isSubmitting}
                className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!hidePrice && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-semibold text-green-900">
              Total de ingredientes:
            </span>
            <span className="text-sm font-semibold text-green-700">
              S/ {totalCost.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                Ingrediente
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                Cantidad
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                Unidad
              </th>
              {!hidePrice && (
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                  Precio
                </th>
              )}
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ingredients.map((item) => (
              <tr
                key={item.ingredient_id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                  {item.ingredient_name}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {item.unit_of_measure}
                </td>
                {!hidePrice && (
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
                    <span className="text-green-600">
                      S/ {item.equivalent_price?.toFixed(2) || "0.00"}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      disabled={isSubmitting}
                      className="p-2.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Editar ingrediente"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.ingredient_id)}
                      disabled={isSubmitting}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar ingrediente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!hidePrice && (
              <tr className="bg-green-50 font-semibold">
                <td
                  colSpan={3}
                  className="px-4 py-3 text-sm text-right text-green-900"
                >
                  Total de ingredientes:
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-700">
                  S/ {totalCost.toFixed(2)}
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

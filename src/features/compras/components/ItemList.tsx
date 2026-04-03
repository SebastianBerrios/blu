"use client";

import { Trash2 } from "lucide-react";
import type { Ingredient, PurchaseItemLine } from "@/types";

interface ItemListProps {
  items: PurchaseItemLine[];
  ingredients: Ingredient[];
  onRemove: (index: number) => void;
  subtotal: number;
  isSubmitting: boolean;
}

export default function ItemList({
  items,
  ingredients,
  onRemove,
  subtotal,
  isSubmitting,
}: ItemListProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-slate-900 mb-2">
        Ítems en la compra ({items.length})
      </h3>

      {/* Mobile card list */}
      <div className="space-y-2 md:hidden">
        {items.map((item, index) => {
          const linkedIngredient = item.ingredient_id
            ? ingredients.find((i) => i.id === item.ingredient_id)
            : null;
          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 capitalize truncate">
                  {item.item_name}
                </p>
                {linkedIngredient && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {linkedIngredient.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className="text-sm font-semibold text-green-600">
                  S/ {item.price.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={isSubmitting}
                  className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg font-semibold">
          <span className="text-sm text-green-900">Subtotal ítems:</span>
          <span className="text-sm text-green-700">
            S/ {subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                Nombre
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                Ingrediente
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                Precio
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 uppercase">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, index) => {
              const linkedIngredient = item.ingredient_id
                ? ingredients.find((i) => i.id === item.ingredient_id)
                : null;
              return (
                <tr
                  key={index}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                    {item.item_name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {linkedIngredient ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        {linkedIngredient.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
                    <span className="text-green-600">
                      S/ {item.price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={isSubmitting}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar ítem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-green-50 font-semibold">
              <td
                colSpan={2}
                className="px-4 py-3 text-sm text-right text-green-900"
              >
                Subtotal ítems:
              </td>
              <td className="px-4 py-3 text-sm text-right text-green-700">
                S/ {subtotal.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

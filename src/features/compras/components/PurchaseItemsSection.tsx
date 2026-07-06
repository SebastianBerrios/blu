"use client";

import type { Ingredient, PurchaseItemLine } from "@/types";
import ItemSelector from "./ItemSelector";
import ItemList from "./ItemList";

interface PurchaseItemsSectionProps {
  items: PurchaseItemLine[];
  ingredients: Ingredient[];
  onAdd: (item: PurchaseItemLine) => void;
  onRemove: (index: number) => void;
  subtotal: number;
  isSubmitting: boolean;
}

/**
 * Bordered container for the purchase items management area:
 * label + helper text + ItemSelector (add) + ItemList (display/remove).
 */
export default function PurchaseItemsSection({
  items,
  ingredients,
  onAdd,
  onRemove,
  subtotal,
  isSubmitting,
}: PurchaseItemsSectionProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <label className="block text-sm font-medium text-slate-900 mb-1">
        Agregar ítems <span className="text-red-600">*</span>
      </label>
      <p className="text-xs text-slate-500 mb-3">
        Selecciona un ingrediente o escribe libremente
      </p>

      <ItemSelector
        ingredients={ingredients}
        onAdd={onAdd}
        isSubmitting={isSubmitting}
      />

      <ItemList
        items={items}
        ingredients={ingredients}
        onRemove={onRemove}
        subtotal={subtotal}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

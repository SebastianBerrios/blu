import { Check, X, ShoppingCart, Trash2, ChefHat } from "lucide-react";
import type { Ingredient, IngredientGroup } from "@/types";
import { getStockColor } from "./stockHelpers";

interface EditingState {
  ingredientId: number;
  value: string;
}

interface StockMobileCardProps {
  ingredient: Ingredient;
  isAdmin: boolean;
  canAdjust: boolean;
  canDiscard: boolean;
  editing: EditingState | null;
  saving: boolean;
  groups: IngredientGroup[];
  onStartEdit: (i: Ingredient) => void;
  onCancelEdit: () => void;
  onSaveEdit: (i: Ingredient) => void;
  onEditChange: (val: string) => void;
  onTogglePurchase: (ingredient: Ingredient) => void;
  onChangeGroup: (ingredient: Ingredient, groupId: number | null) => void;
  onDiscard: (ingredient: Ingredient) => void;
}

export default function StockMobileCard({
  ingredient,
  isAdmin,
  canAdjust,
  canDiscard,
  editing,
  saving,
  groups,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onTogglePurchase,
  onChangeGroup,
  onDiscard,
}: StockMobileCardProps) {
  const isEditing = editing?.ingredientId === ingredient.id;
  const colorClass = getStockColor(ingredient.stock_quantity, ingredient.unit_of_measure);
  const isProducible = ingredient.recipe_id !== null;

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 px-4 py-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isProducible ? (
            <span className="shrink-0 p-1 text-emerald-600" title="Producto producible">
              <ChefHat className="w-4 h-4" />
            </span>
          ) : (
            <button
              onClick={() => onTogglePurchase(ingredient)}
              className={`shrink-0 p-1 rounded transition-colors ${
                ingredient.needs_purchase
                  ? "text-primary-600"
                  : "text-slate-300"
              }`}
              title={ingredient.needs_purchase ? "Quitar de compras" : "Agregar a compras"}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <p className="font-medium text-slate-900 capitalize truncate">{ingredient.name}</p>
            {isAdmin && (
              <select
                value={ingredient.group_id ?? ""}
                onChange={(e) => onChangeGroup(ingredient, e.target.value ? Number(e.target.value) : null)}
                className="text-xs text-slate-500 bg-transparent border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 rounded p-0"
              >
                <option value="">Sin grupo</option>
                {groups.sort((a, b) => a.name.localeCompare(b.name, "es")).map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
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
              {ingredient.stock_quantity} {ingredient.unit_of_measure}
            </span>
            {canAdjust && (
              <button
                onClick={() => onStartEdit(ingredient)}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 hover:bg-primary-50 rounded"
              >
                Ajustar
              </button>
            )}
            {canDiscard && (
              <button
                onClick={() => onDiscard(ingredient)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Descartar (merma)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

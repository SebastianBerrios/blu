"use client";

import type { Ingredient } from "@/types";
import type { RecipeIngredientLine } from "../types";
import Skeleton from "@/components/ui/Skeleton";
import IngredientSelector from "./IngredientSelector";
import IngredientList from "./IngredientList";

interface RecipeIngredientsSectionProps {
  ingredients: Ingredient[];
  recipeIngredients: RecipeIngredientLine[];
  loadingIngredients: boolean;
  editingIngredient: RecipeIngredientLine | null;
  isSubmitting: boolean;
  hidePrice: boolean;
  viewOnly: boolean;
  onAdd: (ingredient: RecipeIngredientLine) => void;
  onUpdate: (ingredientId: number, updated: RecipeIngredientLine) => void;
  onEdit: (item: RecipeIngredientLine) => void;
  onRemove: (ingredientId: number) => void;
  onCancelEdit: () => void;
  totalCost: number;
}

/**
 * Bordered ingredients section: selector (add/edit), loading skeleton,
 * ingredient list, and empty-state message for viewOnly mode.
 */
export default function RecipeIngredientsSection({
  ingredients,
  recipeIngredients,
  loadingIngredients,
  editingIngredient,
  isSubmitting,
  hidePrice,
  viewOnly,
  onAdd,
  onUpdate,
  onEdit,
  onRemove,
  onCancelEdit,
  totalCost,
}: RecipeIngredientsSectionProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <label className="block text-sm font-medium text-slate-900 mb-3">
        Ingredientes de la receta {!viewOnly && <span className="text-red-600">*</span>}
      </label>

      {!viewOnly && (
        <IngredientSelector
          ingredients={ingredients}
          recipeIngredients={recipeIngredients}
          onAdd={onAdd}
          onUpdate={onUpdate}
          editingItem={editingIngredient}
          onCancelEdit={onCancelEdit}
          isSubmitting={isSubmitting}
        />
      )}

      {loadingIngredients && recipeIngredients.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white border border-slate-200 rounded-lg"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <IngredientList
          ingredients={recipeIngredients}
          onEdit={onEdit}
          onRemove={onRemove}
          hidePrice={hidePrice}
          totalCost={totalCost}
          isSubmitting={isSubmitting}
          viewOnly={viewOnly}
        />
      )}

      {viewOnly && recipeIngredients.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          Esta receta no tiene ingredientes registrados.
        </p>
      )}
    </div>
  );
}

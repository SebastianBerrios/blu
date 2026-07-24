import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { CreateRecipe, Recipe } from "@/types";

/**
 * Builds the linked-ingredient row that makes a recipe "producible" — the
 * intermediate good whose stock the production flow feeds. Pure; stock starts
 * at 0 (production is what adds units).
 */
export function buildLinkedIngredientRow(
  formData: CreateRecipe,
  recipeId: number
) {
  return {
    name: formData.name.toLowerCase(),
    quantity: Number(formData.quantity),
    stock_quantity: 0,
    unit_of_measure: formData.unit_of_measure,
    price: Number(formData.manufacturing_cost),
    recipe_id: recipeId,
  };
}

/** Reads the ingredient linked to a recipe (if the recipe is "producible"). */
export async function fetchRecipeProducible(
  recipeId: number
): Promise<{ ingredientId: number; stockQuantity: number } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, stock_quantity")
    .eq("recipe_id", recipeId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { ingredientId: data.id, stockQuantity: data.stock_quantity ?? 0 }
    : null;
}

/**
 * Reconciles the recipe's "producible" state against the linked ingredient:
 * creates the linked ingredient when turning it on, or removes it (only if it
 * has no stock and is not referenced) when turning it off. No-op unless
 * addAsIngredient is explicit. Logs the transition for audit.
 */
export async function syncRecipeProducible(params: {
  recipe: Recipe;
  formData: CreateRecipe;
  addAsIngredient: boolean;
  userId: string | null;
  userName: string | null;
}): Promise<void> {
  const { recipe, formData, addAsIngredient, userId, userName } = params;
  const supabase = createClient();
  const linked = await fetchRecipeProducible(recipe.id);

  if (addAsIngredient && !linked) {
    // Turn on: create the linked ingredient.
    const { error: insertError } = await supabase
      .from("ingredients")
      .insert(buildLinkedIngredientRow(formData, recipe.id));
    if (insertError) throw insertError;

    logAudit({
      userId,
      userName,
      action: "convertir_receta_producible",
      targetTable: "recipes",
      targetId: recipe.id,
      targetDescription: `Receta: ${formData.name} marcada como producible`,
    });
  } else if (!addAsIngredient && linked) {
    // Turn off: only if the linked ingredient has no stock.
    if (linked.stockQuantity > 0) {
      throw new Error(
        "No se puede quitar el producible: el ingrediente vinculado tiene stock. Descártalo primero en Inventario.",
      );
    }
    const { error: deleteError } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", linked.ingredientId);
    if (deleteError) {
      throw new Error(
        "No se puede quitar el producible: el ingrediente vinculado está en uso (otras recetas, ventas o movimientos).",
      );
    }

    logAudit({
      userId,
      userName,
      action: "quitar_receta_producible",
      targetTable: "recipes",
      targetId: recipe.id,
      targetDescription: `Receta: ${formData.name} dejó de ser producible`,
    });
  }
}

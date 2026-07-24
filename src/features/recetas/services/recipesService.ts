import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { CreateRecipe } from "@/types";
import type { RecipeSubmitParams } from "../types";
import {
  computeIngredientDiff,
  replaceRecipeIngredients,
} from "./recipeIngredientsService";
import {
  buildLinkedIngredientRow,
  syncRecipeProducible,
} from "./recipeProducibleService";

/** Full recipe row payload shared by create/update. */
function buildRecipeData(formData: CreateRecipe) {
  return {
    name: formData.name.toLowerCase(),
    description: formData.description,
    preparation_steps: formData.preparation_steps || null,
    quantity: Number(formData.quantity),
    unit_of_measure: formData.unit_of_measure,
    manufacturing_cost: Number(formData.manufacturing_cost),
  };
}

/** Per-unit cost of a batch recipe; 0 when the yield is unknown. */
function computeUnitCost(cost: number, quantity: number): number {
  return quantity > 0 ? Number((cost / quantity).toFixed(2)) : 0;
}

export async function updateRecipeIngredientsOnly(
  params: RecipeSubmitParams,
): Promise<void> {
  const { formData, ingredients, originalIngredients, recipe, productId, userId, userName } =
    params;
  if (!recipe) throw new Error("Recipe is required for this operation");

  const supabase = createClient();

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({
      description: formData.description,
      preparation_steps: formData.preparation_steps || null,
      manufacturing_cost: Number(formData.manufacturing_cost),
    })
    .eq("id", recipe.id);
  if (recipeError) throw recipeError;

  await replaceRecipeIngredients(recipe.id, ingredients);

  await supabase
    .from("ingredients")
    .update({ price: Number(formData.manufacturing_cost) })
    .eq("recipe_id", recipe.id);

  if (productId && recipe.quantity > 0) {
    await supabase
      .from("products")
      .update({
        manufacturing_cost: computeUnitCost(
          Number(formData.manufacturing_cost),
          recipe.quantity,
        ),
      })
      .eq("id", productId);
  }

  const diff = computeIngredientDiff(originalIngredients, ingredients);
  logAudit({
    userId,
    userName,
    action: "editar_ingredientes_receta",
    targetTable: "recipes",
    targetId: recipe.id,
    targetDescription: `Receta: ${recipe.name}`,
    details: {
      recipe_name: recipe.name,
      product_id: productId ?? null,
      new_cost: Number(formData.manufacturing_cost),
      ...diff,
    },
  });
}

export async function updateRecipe(params: RecipeSubmitParams): Promise<void> {
  const { formData, ingredients, recipe, addAsIngredient, userId, userName } =
    params;
  if (!recipe) throw new Error("Recipe is required for update");

  const supabase = createClient();

  const { error } = await supabase
    .from("recipes")
    .update(buildRecipeData(formData))
    .eq("id", recipe.id);
  if (error) throw error;

  await supabase
    .from("ingredients")
    .update({
      name: formData.name.toLowerCase(),
      quantity: Number(formData.quantity),
      unit_of_measure: formData.unit_of_measure,
      price: Number(formData.manufacturing_cost),
    })
    .eq("recipe_id", recipe.id);

  await replaceRecipeIngredients(recipe.id, ingredients);

  // Sync "producible" state only when addAsIngredient is explicit.
  if (addAsIngredient !== undefined) {
    await syncRecipeProducible({
      recipe,
      formData,
      addAsIngredient,
      userId,
      userName,
    });
  }
}

export async function createRecipe(params: RecipeSubmitParams): Promise<void> {
  const { formData, ingredients, addAsIngredient, productId, userId, userName } =
    params;

  const supabase = createClient();

  const { data: newRecipe, error } = await supabase
    .from("recipes")
    .insert(buildRecipeData(formData))
    .select()
    .single();
  if (error) throw error;

  if (addAsIngredient) {
    await supabase
      .from("ingredients")
      .insert(buildLinkedIngredientRow(formData, newRecipe.id));
  }

  if (productId) {
    await supabase
      .from("products")
      .update({
        recipe_id: newRecipe.id,
        manufacturing_cost: computeUnitCost(
          Number(formData.manufacturing_cost),
          Number(formData.quantity),
        ),
      })
      .eq("id", productId);

    logAudit({
      userId,
      userName,
      action: "crear_receta_producto",
      targetTable: "recipes",
      targetId: newRecipe.id,
      targetDescription: `Receta: ${formData.name} para producto #${productId}`,
      details: {
        recipe_name: formData.name,
        product_id: productId,
        total_cost: Number(formData.manufacturing_cost),
        ingredients: ingredients.map((i) => ({
          name: i.ingredient_name,
          quantity: i.quantity,
          unit: i.unit_of_measure,
        })),
      },
    });
  }

  await replaceRecipeIngredients(newRecipe.id, ingredients);
}

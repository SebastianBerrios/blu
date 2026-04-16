import { createClient } from "@/utils/supabase/client";
import type { RecipeIngredientWithRelation } from "@/types";
import type { RecipeIngredientLine } from "../types";
import { calculateIngredientCost } from "./recipeCalculations";

export async function loadRecipeIngredients(
  recipeId: number
): Promise<RecipeIngredientLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      `
      quantity,
      unit_of_measure,
      recipe_ingredients_id,
      ingredients (
        id,
        name,
        price,
        quantity,
        unit_of_measure
      )
    `
    )
    .eq("recipe_id", recipeId);

  if (error) throw error;
  if (!data) return [];

  const typedData = data as unknown as RecipeIngredientWithRelation[];
  return typedData.map((item) => {
    const equivalentPrice = calculateIngredientCost(
      item.quantity,
      item.unit_of_measure,
      item.ingredients.price,
      item.ingredients.quantity,
      item.ingredients.unit_of_measure
    );

    return {
      ingredient_id: item.ingredients.id,
      ingredient_name: item.ingredients.name,
      quantity: item.quantity,
      unit_of_measure: item.unit_of_measure,
      ingredient_price: item.ingredients.price,
      ingredient_unit: item.ingredients.unit_of_measure,
      ingredient_quantity_stock: item.ingredients.quantity,
      equivalent_price: equivalentPrice,
    };
  });
}

export function buildIngredientsToInsert(
  recipeId: number,
  ingredients: RecipeIngredientLine[]
) {
  return ingredients.map((ingredient) => ({
    recipe_id: recipeId,
    recipe_ingredients_id: ingredient.ingredient_id,
    quantity: ingredient.quantity,
    unit_of_measure: ingredient.unit_of_measure,
  }));
}

export function computeIngredientDiff(
  original: RecipeIngredientLine[],
  current: RecipeIngredientLine[]
) {
  const originalMap = new Map(original.map((i) => [i.ingredient_id, i]));
  const currentMap = new Map(current.map((i) => [i.ingredient_id, i]));

  const added: { name: string; quantity: number; unit: string }[] = [];
  const removed: { name: string; quantity: number; unit: string }[] = [];
  const modified: { name: string; from: string; to: string }[] = [];

  for (const curr of current) {
    const orig = originalMap.get(curr.ingredient_id);
    if (!orig) {
      added.push({
        name: curr.ingredient_name,
        quantity: curr.quantity,
        unit: curr.unit_of_measure,
      });
    } else if (
      orig.quantity !== curr.quantity ||
      orig.unit_of_measure !== curr.unit_of_measure
    ) {
      modified.push({
        name: curr.ingredient_name,
        from: `${orig.quantity} ${orig.unit_of_measure}`,
        to: `${curr.quantity} ${curr.unit_of_measure}`,
      });
    }
  }

  for (const orig of original) {
    if (!currentMap.has(orig.ingredient_id)) {
      removed.push({
        name: orig.ingredient_name,
        quantity: orig.quantity,
        unit: orig.unit_of_measure,
      });
    }
  }

  return { added, removed, modified };
}

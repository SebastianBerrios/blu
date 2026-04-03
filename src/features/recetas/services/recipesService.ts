import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { RecipeIngredientWithRelation } from "@/types";
import type { RecipeIngredientLine, RecipeSubmitParams } from "../types";

// --- Pure helpers ---

export function convertToBaseUnit(
  quantity: number,
  unit: string,
  targetType: "weight" | "volume"
): number {
  const weightUnits: Record<string, number> = { kg: 1000, g: 1 };
  const volumeUnits: Record<string, number> = { l: 1000, ml: 1 };

  if (targetType === "weight" && weightUnits[unit]) {
    return quantity * weightUnits[unit];
  }
  if (targetType === "volume" && volumeUnits[unit]) {
    return quantity * volumeUnits[unit];
  }
  return quantity;
}

export function calculateIngredientCost(
  recipeQuantity: number,
  recipeUnit: string,
  ingredientPrice: number,
  ingredientQuantity: number,
  ingredientUnit: string
): number {
  const isWeight =
    ["kg", "g"].includes(recipeUnit) && ["kg", "g"].includes(ingredientUnit);
  const isVolume =
    ["l", "ml"].includes(recipeUnit) && ["l", "ml"].includes(ingredientUnit);

  if (isWeight) {
    const recipeInGrams = convertToBaseUnit(recipeQuantity, recipeUnit, "weight");
    const stockInGrams = convertToBaseUnit(ingredientQuantity, ingredientUnit, "weight");
    return (recipeInGrams / stockInGrams) * ingredientPrice;
  }

  if (isVolume) {
    const recipeInMl = convertToBaseUnit(recipeQuantity, recipeUnit, "volume");
    const stockInMl = convertToBaseUnit(ingredientQuantity, ingredientUnit, "volume");
    return (recipeInMl / stockInMl) * ingredientPrice;
  }

  if (recipeUnit === "und" && ingredientUnit === "und") {
    return (recipeQuantity / ingredientQuantity) * ingredientPrice;
  }

  return 0;
}

export function calculateTotalCost(ingredients: RecipeIngredientLine[]): number {
  return ingredients.reduce((sum, item) => {
    const cost = calculateIngredientCost(
      item.quantity,
      item.unit_of_measure,
      item.ingredient_price,
      item.ingredient_quantity_stock,
      item.ingredient_unit
    );
    return sum + cost;
  }, 0);
}

function computeIngredientDiff(
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
      added.push({ name: curr.ingredient_name, quantity: curr.quantity, unit: curr.unit_of_measure });
    } else if (orig.quantity !== curr.quantity || orig.unit_of_measure !== curr.unit_of_measure) {
      modified.push({
        name: curr.ingredient_name,
        from: `${orig.quantity} ${orig.unit_of_measure}`,
        to: `${curr.quantity} ${curr.unit_of_measure}`,
      });
    }
  }

  for (const orig of original) {
    if (!currentMap.has(orig.ingredient_id)) {
      removed.push({ name: orig.ingredient_name, quantity: orig.quantity, unit: orig.unit_of_measure });
    }
  }

  return { added, removed, modified };
}

function buildIngredientsToInsert(recipeId: number, ingredients: RecipeIngredientLine[]) {
  return ingredients.map((ingredient) => ({
    recipe_id: recipeId,
    recipe_ingredients_id: ingredient.ingredient_id,
    quantity: ingredient.quantity,
    unit_of_measure: ingredient.unit_of_measure,
  }));
}

// --- Data fetching ---

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

// --- Mutations ---

export async function updateRecipeIngredientsOnly(
  params: RecipeSubmitParams
): Promise<void> {
  const { formData, ingredients, originalIngredients, recipe, productId, userId, userName } = params;
  if (!recipe) throw new Error("Recipe is required for this operation");

  const supabase = createClient();

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({ manufacturing_cost: Number(formData.manufacturing_cost) })
    .eq("id", recipe.id);
  if (recipeError) throw recipeError;

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(buildIngredientsToInsert(recipe.id, ingredients));
  if (ingredientsError) throw ingredientsError;

  await supabase
    .from("ingredients")
    .update({ price: Number(formData.manufacturing_cost) })
    .eq("name", recipe.name.toLowerCase());

  if (productId && recipe.quantity > 0) {
    const unitCost = Number(formData.manufacturing_cost) / recipe.quantity;
    await supabase
      .from("products")
      .update({ manufacturing_cost: Number(unitCost.toFixed(2)) })
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
  const { formData, ingredients, recipe } = params;
  if (!recipe) throw new Error("Recipe is required for update");

  const supabase = createClient();

  const recipeData = {
    name: formData.name.toLowerCase(),
    description: formData.description,
    quantity: Number(formData.quantity),
    unit_of_measure: formData.unit_of_measure,
    manufacturing_cost: Number(formData.manufacturing_cost),
  };

  const { error } = await supabase
    .from("recipes")
    .update(recipeData)
    .eq("id", recipe.id);
  if (error) throw error;

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);

  await supabase
    .from("ingredients")
    .update({
      name: formData.name.toLowerCase(),
      quantity: Number(formData.quantity),
      unit_of_measure: formData.unit_of_measure,
      price: Number(formData.manufacturing_cost),
    })
    .eq("name", recipe.name.toLowerCase());

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(buildIngredientsToInsert(recipe.id, ingredients));
  if (ingredientsError) throw ingredientsError;
}

export async function createRecipe(params: RecipeSubmitParams): Promise<void> {
  const { formData, ingredients, addAsIngredient, productId, userId, userName } = params;

  const supabase = createClient();

  const recipeData = {
    name: formData.name.toLowerCase(),
    description: formData.description,
    quantity: Number(formData.quantity),
    unit_of_measure: formData.unit_of_measure,
    manufacturing_cost: Number(formData.manufacturing_cost),
  };

  const { data: newRecipe, error } = await supabase
    .from("recipes")
    .insert(recipeData)
    .select()
    .single();
  if (error) throw error;

  if (addAsIngredient) {
    await supabase.from("ingredients").insert({
      name: formData.name.toLowerCase(),
      quantity: Number(formData.quantity),
      unit_of_measure: formData.unit_of_measure,
      price: Number(formData.manufacturing_cost),
    });
  }

  if (productId) {
    const unitCost =
      Number(formData.quantity) > 0
        ? Number(formData.manufacturing_cost) / Number(formData.quantity)
        : 0;
    await supabase
      .from("products")
      .update({
        recipe_id: newRecipe.id,
        manufacturing_cost: Number(unitCost.toFixed(2)),
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

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(buildIngredientsToInsert(newRecipe.id, ingredients));
  if (ingredientsError) throw ingredientsError;
}

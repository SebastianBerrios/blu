import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { RecipeSubmitParams } from "../types";
import {
  buildIngredientsToInsert,
  computeIngredientDiff,
} from "./recipeIngredientsService";

export async function updateRecipeIngredientsOnly(
  params: RecipeSubmitParams
): Promise<void> {
  const {
    formData,
    ingredients,
    originalIngredients,
    recipe,
    productId,
    userId,
    userName,
  } = params;
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

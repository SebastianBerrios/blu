import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { RecipeSubmitParams } from "../types";
import {
  buildIngredientsToInsert,
  computeIngredientDiff,
} from "./recipeIngredientsService";

async function replaceRecipeIngredients(
  recipeId: number,
  ingredients: ReturnType<typeof buildIngredientsToInsert>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("replace_recipe_ingredients", {
    p_recipe_id: recipeId,
    p_ingredients: ingredients as unknown as never,
  });
  if (error) throw error;
}

export async function updateRecipeIngredientsOnly(
  params: RecipeSubmitParams,
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
    .update({
      description: formData.description,
      preparation_steps: formData.preparation_steps || null,
      manufacturing_cost: Number(formData.manufacturing_cost),
    })
    .eq("id", recipe.id);
  if (recipeError) throw recipeError;

  await replaceRecipeIngredients(
    recipe.id,
    buildIngredientsToInsert(recipe.id, ingredients),
  );

  await supabase
    .from("ingredients")
    .update({ price: Number(formData.manufacturing_cost) })
    .eq("recipe_id", recipe.id);

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

/** Lee el ingrediente vinculado a una receta (si la receta es "producible"). */
export async function fetchRecipeProducible(
  recipeId: number,
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

export async function updateRecipe(params: RecipeSubmitParams): Promise<void> {
  const { formData, ingredients, recipe, addAsIngredient, userId, userName } =
    params;
  if (!recipe) throw new Error("Recipe is required for update");

  const supabase = createClient();

  const recipeData = {
    name: formData.name.toLowerCase(),
    description: formData.description,
    preparation_steps: formData.preparation_steps || null,
    quantity: Number(formData.quantity),
    unit_of_measure: formData.unit_of_measure,
    manufacturing_cost: Number(formData.manufacturing_cost),
  };

  const { error } = await supabase
    .from("recipes")
    .update(recipeData)
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

  await replaceRecipeIngredients(
    recipe.id,
    buildIngredientsToInsert(recipe.id, ingredients),
  );

  // Sincronizar estado "producible" (solo cuando addAsIngredient es explícito)
  if (addAsIngredient !== undefined) {
    const linked = await fetchRecipeProducible(recipe.id);

    if (addAsIngredient && !linked) {
      // Convertir en producible: crear el ingrediente vinculado
      const { error: insertError } = await supabase.from("ingredients").insert({
        name: formData.name.toLowerCase(),
        quantity: Number(formData.quantity),
        stock_quantity: 0,
        unit_of_measure: formData.unit_of_measure,
        price: Number(formData.manufacturing_cost),
        recipe_id: recipe.id,
      });
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
      // Quitar producible: solo si no tiene stock
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
}

export async function createRecipe(params: RecipeSubmitParams): Promise<void> {
  const { formData, ingredients, addAsIngredient, productId, userId, userName } =
    params;

  const supabase = createClient();

  const recipeData = {
    name: formData.name.toLowerCase(),
    description: formData.description,
    preparation_steps: formData.preparation_steps || null,
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
      stock_quantity: 0,
      unit_of_measure: formData.unit_of_measure,
      price: Number(formData.manufacturing_cost),
      recipe_id: newRecipe.id,
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

  await replaceRecipeIngredients(
    newRecipe.id,
    buildIngredientsToInsert(newRecipe.id, ingredients),
  );
}

import type { Tables } from "./database";

export type Recipe = Tables<"recipes">;

/** Recipe + flag derivado: true si tiene un ingrediente vinculado (recipe_id),
 *  lo que la convierte en "producible" (fabricable por lotes en Inventario → Producción). */
export interface RecipeWithProducible extends Recipe {
  is_producible: boolean;
}

export interface CreateRecipe {
  name: string;
  description: string;
  preparation_steps: string;
  quantity: number;
  unit_of_measure: string;
  manufacturing_cost: number;
}

export interface RecipeIngredientItem {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_of_measure: string;
}

export interface RecipeIngredientWithRelation {
  quantity: number;
  unit_of_measure: string;
  recipe_ingredients_id: number;
  ingredients: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    unit_of_measure: string;
    unit_weight_g: number | null;
  };
}

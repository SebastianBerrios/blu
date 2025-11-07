import type { Tables } from "./database";

export type RecipeIngredients = Tables<"recipe_ingredients">;

export interface CreateRecipeIngredients {
  recipe_ingredients_id: number;
  recipe_id: number;
  quantity: number;
  unit_of_measure: string;
}

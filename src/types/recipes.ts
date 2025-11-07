import type { Tables } from "./database";

export type Recipe = Tables<"recipes">;

export interface CreateRecipe {
  name: string;
  description: string;
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

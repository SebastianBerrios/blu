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
  };
}

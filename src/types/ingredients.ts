import type { Tables } from "./database";

export type Ingredient = Tables<"ingredients">;

export type IngredientGroup = Tables<"ingredient_groups">;

export interface CreateIngredient {
  name: string;
  quantity: number;
  unit_of_measure: string;
  price: number;
  group_id?: number | null;
}

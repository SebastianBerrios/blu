import type { Tables } from "./database";

export type Ingredient = Tables<"ingredients">;

export interface CreateIngredient {
  name: string;
  quantity: number;
  unit_of_measure: string;
  price: number;
}

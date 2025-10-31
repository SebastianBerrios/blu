import type { Tables } from "./database";

export type Recipe = Tables<"recipes">;

export interface CreateRecipe {
  name: string;
  description: string;
  slice: number;
  manufacturing_cost: number;
  sale_price_per_slice: number;
}

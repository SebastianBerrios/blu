import type { Tables } from "./database";

export type Ingredient = Tables<"ingredients">;

export type IngredientGroup = Tables<"ingredient_groups">;

export interface CreateIngredient {
  name: string;
  quantity: number;
  unit_of_measure: string;
  price: number;
  group_id?: number | null;
  /** Gramos por 1 unidad. Opcional; habilita usar el ingrediente por unidad o por peso. */
  unit_weight_g?: number | null;
}

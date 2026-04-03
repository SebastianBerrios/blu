import type { CreateRecipe, Recipe } from "@/types";

export interface RecipeIngredientLine {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_of_measure: string;
  ingredient_price: number;
  ingredient_unit: string;
  ingredient_quantity_stock: number;
  equivalent_price?: number;
}

export interface RecipeSubmitParams {
  formData: CreateRecipe;
  ingredients: RecipeIngredientLine[];
  originalIngredients: RecipeIngredientLine[];
  recipe?: Recipe;
  productId?: number;
  readOnlyMeta?: boolean;
  addAsIngredient?: boolean;
  userId: string | null;
  userName: string | null;
}

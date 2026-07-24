import type { RecipeIngredientLine } from "../types";
import { convert } from "@/utils/helpers/units";

// Pure helpers — cost calculations. Unit conversion lives in @/utils/helpers/units.

export function calculateIngredientCost(
  recipeQuantity: number,
  recipeUnit: string,
  ingredientPrice: number,
  ingredientQuantity: number,
  ingredientUnit: string,
  ingredientUnitWeightG?: number | null
): number {
  if (!ingredientQuantity) return 0;

  // Llevar la cantidad de la receta a la unidad del ingrediente. Soporta kg/g,
  // l/ml, conteo/personalizadas, y el bridge und↔g/kg vía peso por unidad.
  const recipeInIngredientUnit = convert(
    recipeQuantity,
    recipeUnit,
    ingredientUnit,
    ingredientUnitWeightG,
  );
  if (recipeInIngredientUnit === null) return 0; // unidades incompatibles

  return (recipeInIngredientUnit / ingredientQuantity) * ingredientPrice;
}

export function calculateTotalCost(ingredients: RecipeIngredientLine[]): number {
  return ingredients.reduce((sum, item) => {
    const cost = calculateIngredientCost(
      item.quantity,
      item.unit_of_measure,
      item.ingredient_price,
      item.ingredient_quantity_stock,
      item.ingredient_unit,
      item.ingredient_unit_weight_g
    );
    return sum + cost;
  }, 0);
}

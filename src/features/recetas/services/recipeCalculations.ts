import type { RecipeIngredientLine } from "../types";

// Pure helpers — unit conversions and cost calculations.

export function convertToBaseUnit(
  quantity: number,
  unit: string,
  targetType: "weight" | "volume"
): number {
  const weightUnits: Record<string, number> = { kg: 1000, g: 1 };
  const volumeUnits: Record<string, number> = { l: 1000, ml: 1 };

  if (targetType === "weight" && weightUnits[unit]) {
    return quantity * weightUnits[unit];
  }
  if (targetType === "volume" && volumeUnits[unit]) {
    return quantity * volumeUnits[unit];
  }
  return quantity;
}

export function calculateIngredientCost(
  recipeQuantity: number,
  recipeUnit: string,
  ingredientPrice: number,
  ingredientQuantity: number,
  ingredientUnit: string
): number {
  const isWeight =
    ["kg", "g"].includes(recipeUnit) && ["kg", "g"].includes(ingredientUnit);
  const isVolume =
    ["l", "ml"].includes(recipeUnit) && ["l", "ml"].includes(ingredientUnit);

  if (isWeight) {
    const recipeInGrams = convertToBaseUnit(recipeQuantity, recipeUnit, "weight");
    const stockInGrams = convertToBaseUnit(ingredientQuantity, ingredientUnit, "weight");
    return (recipeInGrams / stockInGrams) * ingredientPrice;
  }

  if (isVolume) {
    const recipeInMl = convertToBaseUnit(recipeQuantity, recipeUnit, "volume");
    const stockInMl = convertToBaseUnit(ingredientQuantity, ingredientUnit, "volume");
    return (recipeInMl / stockInMl) * ingredientPrice;
  }

  if (recipeUnit === "und" && ingredientUnit === "und") {
    return (recipeQuantity / ingredientQuantity) * ingredientPrice;
  }

  return 0;
}

export function calculateTotalCost(ingredients: RecipeIngredientLine[]): number {
  return ingredients.reduce((sum, item) => {
    const cost = calculateIngredientCost(
      item.quantity,
      item.unit_of_measure,
      item.ingredient_price,
      item.ingredient_quantity_stock,
      item.ingredient_unit
    );
    return sum + cost;
  }, 0);
}

import { describe, it, expect } from "vitest";
import type { RecipeIngredientLine } from "../types";
import {
  buildIngredientsToInsert,
  computeIngredientDiff,
} from "./recipeIngredientsService";

function line(overrides: Partial<RecipeIngredientLine> = {}): RecipeIngredientLine {
  return {
    ingredient_id: 1,
    ingredient_name: "Harina",
    quantity: 100,
    unit_of_measure: "g",
    ingredient_price: 30,
    ingredient_unit: "kg",
    ingredient_quantity_stock: 1,
    ...overrides,
  };
}

describe("buildIngredientsToInsert", () => {
  it("mapea cada línea al shape de la tabla recipe_ingredients", () => {
    const rows = buildIngredientsToInsert(7, [
      line({ ingredient_id: 1, quantity: 100, unit_of_measure: "g" }),
      line({ ingredient_id: 2, quantity: 250, unit_of_measure: "ml" }),
    ]);
    expect(rows).toEqual([
      { recipe_id: 7, recipe_ingredients_id: 1, quantity: 100, unit_of_measure: "g" },
      { recipe_id: 7, recipe_ingredients_id: 2, quantity: 250, unit_of_measure: "ml" },
    ]);
  });

  it("retorna [] con array vacío", () => {
    expect(buildIngredientsToInsert(1, [])).toEqual([]);
  });
});

describe("computeIngredientDiff", () => {
  it("detecta added/removed/modified", () => {
    const original = [
      line({ ingredient_id: 1, ingredient_name: "Harina", quantity: 100, unit_of_measure: "g" }),
      line({ ingredient_id: 2, ingredient_name: "Sal", quantity: 5, unit_of_measure: "g" }),
    ];
    const current = [
      // Harina: cambia quantity 100 → 150
      line({ ingredient_id: 1, ingredient_name: "Harina", quantity: 150, unit_of_measure: "g" }),
      // Sal: removido (no aparece)
      // Azúcar: agregado
      line({ ingredient_id: 3, ingredient_name: "Azúcar", quantity: 30, unit_of_measure: "g" }),
    ];

    const diff = computeIngredientDiff(original, current);

    expect(diff.added).toEqual([
      { name: "Azúcar", quantity: 30, unit: "g" },
    ]);
    expect(diff.removed).toEqual([
      { name: "Sal", quantity: 5, unit: "g" },
    ]);
    expect(diff.modified).toEqual([
      { name: "Harina", from: "100 g", to: "150 g" },
    ]);
  });

  it("modified detecta cambio solo en unit_of_measure (mismo quantity)", () => {
    const original = [line({ ingredient_id: 1, quantity: 1, unit_of_measure: "kg" })];
    const current = [line({ ingredient_id: 1, quantity: 1, unit_of_measure: "g" })];
    expect(computeIngredientDiff(original, current).modified).toHaveLength(1);
  });

  it("sin cambios retorna 3 arrays vacíos", () => {
    const lines = [line({ ingredient_id: 1 }), line({ ingredient_id: 2 })];
    const diff = computeIngredientDiff(lines, lines);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("todo nuevo: original vacío", () => {
    const diff = computeIngredientDiff([], [
      line({ ingredient_id: 1, ingredient_name: "X" }),
    ]);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });
});

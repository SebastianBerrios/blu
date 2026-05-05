import { describe, it, expect } from "vitest";
import type { RecipeIngredientLine } from "../types";
import {
  convertToBaseUnit,
  calculateIngredientCost,
  calculateTotalCost,
} from "./recipeCalculations";

describe("convertToBaseUnit", () => {
  it("convierte kg → g (multiplica por 1000)", () => {
    expect(convertToBaseUnit(2, "kg", "weight")).toBe(2000);
  });

  it("preserva g cuando ya está en gramos", () => {
    expect(convertToBaseUnit(500, "g", "weight")).toBe(500);
  });

  it("convierte l → ml", () => {
    expect(convertToBaseUnit(1.5, "l", "volume")).toBe(1500);
  });

  it("preserva ml", () => {
    expect(convertToBaseUnit(250, "ml", "volume")).toBe(250);
  });

  it("retorna quantity sin convertir si la unidad no aplica al tipo (ej: ml en weight)", () => {
    expect(convertToBaseUnit(100, "ml", "weight")).toBe(100);
  });

  it("retorna quantity sin convertir si la unidad es desconocida", () => {
    expect(convertToBaseUnit(5, "und", "weight")).toBe(5);
  });
});

describe("calculateIngredientCost", () => {
  it("peso: 100g de un ingrediente que cuesta S/30 por kg = S/3", () => {
    expect(
      calculateIngredientCost(100, "g", 30, 1, "kg"),
    ).toBeCloseTo(3, 5);
  });

  it("volumen: 250ml de un ingrediente que cuesta S/40 por litro = S/10", () => {
    expect(
      calculateIngredientCost(250, "ml", 40, 1, "l"),
    ).toBeCloseTo(10, 5);
  });

  it("unidades: 3 und de algo que cuesta S/12 por 4 und = S/9", () => {
    expect(
      calculateIngredientCost(3, "und", 12, 4, "und"),
    ).toBeCloseTo(9, 5);
  });

  it("retorna 0 cuando las unidades son incompatibles (g vs ml)", () => {
    expect(calculateIngredientCost(100, "g", 30, 1, "l")).toBe(0);
  });

  it("retorna 0 cuando una unidad no es conocida", () => {
    expect(calculateIngredientCost(1, "und", 10, 1, "kg")).toBe(0);
  });

  it("convierte cuando ambos están en la misma unidad base distinta (kg vs g)", () => {
    // 500g de algo que cuesta S/20 por 1kg → S/10
    expect(
      calculateIngredientCost(500, "g", 20, 1, "kg"),
    ).toBeCloseTo(10, 5);
  });
});

describe("calculateTotalCost", () => {
  function line(
    overrides: Partial<RecipeIngredientLine> = {},
  ): RecipeIngredientLine {
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

  it("retorna 0 con array vacío", () => {
    expect(calculateTotalCost([])).toBe(0);
  });

  it("suma costos de múltiples ingredientes", () => {
    const ingredients = [
      line({ quantity: 100 }), // 100g de harina @ S/30/kg = 3
      line({
        ingredient_name: "Leche",
        quantity: 250,
        unit_of_measure: "ml",
        ingredient_price: 40,
        ingredient_unit: "l",
      }), // 250ml de leche @ S/40/l = 10
    ];
    expect(calculateTotalCost(ingredients)).toBeCloseTo(13, 5);
  });

  it("ignora (cuenta como 0) ingredientes con unidades incompatibles", () => {
    const ingredients = [
      line({ quantity: 100 }), // 3
      line({
        ingredient_name: "raro",
        quantity: 5,
        unit_of_measure: "und",
        ingredient_price: 10,
        ingredient_unit: "kg",
      }), // 0
    ];
    expect(calculateTotalCost(ingredients)).toBeCloseTo(3, 5);
  });
});

import { describe, it, expect } from "vitest";
import type { Product } from "@/types";
import type { SaleProductLine } from "../types";
import {
  applyLoyaltyReward,
  removeLoyaltyReward,
  getEligibleIndices,
} from "./loyaltyUtils";

function makeLine(overrides: Partial<SaleProductLine> = {}): SaleProductLine {
  return {
    product_id: 1,
    product_name: "Latte",
    quantity: 1,
    unit_price: 12,
    subtotal: 12,
    temperatura: "caliente",
    tipo_leche: "entera",
    category_id: 10,
    loyalty_reward: null,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Latte",
    category_id: 10,
    price: 12,
    manufacturing_cost: null,
    suggested_price: null,
    temperatura: null,
    tipo_leche: null,
    recipe_id: null,
    is_available: true,
    rappi_price: null,
    ...overrides,
  } as Product;
}

describe("applyLoyaltyReward", () => {
  it("returns same array when index is out of range", () => {
    const lines = [makeLine()];
    expect(applyLoyaltyReward(lines, 5, "50_postre")).toBe(lines);
  });

  describe("qty === 1", () => {
    it("50_postre halves unit_price and subtotal in place", () => {
      const lines = [makeLine({ unit_price: 20, subtotal: 20 })];
      const result = applyLoyaltyReward(lines, 0, "50_postre");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        quantity: 1,
        unit_price: 10,
        subtotal: 10,
        loyalty_reward: "50_postre",
      });
    });

    it("bebida_gratis sets price/subtotal to 0", () => {
      const lines = [makeLine({ unit_price: 15, subtotal: 15 })];
      const result = applyLoyaltyReward(lines, 0, "bebida_gratis");
      expect(result[0]).toMatchObject({
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
        loyalty_reward: "bebida_gratis",
      });
    });
  });

  describe("qty > 1", () => {
    it("splits a qty=3 line into qty=2 full + qty=1 rewarded", () => {
      const lines = [makeLine({ quantity: 3, subtotal: 36 })];
      const result = applyLoyaltyReward(lines, 0, "50_postre");
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        quantity: 2,
        unit_price: 12,
        subtotal: 24,
        loyalty_reward: null,
      });
      expect(result[1]).toMatchObject({
        quantity: 1,
        unit_price: 6,
        subtotal: 6,
        loyalty_reward: "50_postre",
      });
    });

    it("preserves siblings around the split index", () => {
      const lines = [
        makeLine({ product_id: 1, product_name: "Latte" }),
        makeLine({ product_id: 2, product_name: "Croissant", quantity: 2, subtotal: 20, unit_price: 10 }),
        makeLine({ product_id: 3, product_name: "Mojito" }),
      ];
      const result = applyLoyaltyReward(lines, 1, "50_postre");
      expect(result).toHaveLength(4);
      expect(result[0].product_name).toBe("Latte");
      expect(result[1].product_name).toBe("Croissant");
      expect(result[1].quantity).toBe(1);
      expect(result[1].loyalty_reward).toBeNull();
      expect(result[2].product_name).toBe("Croissant");
      expect(result[2].loyalty_reward).toBe("50_postre");
      expect(result[3].product_name).toBe("Mojito");
    });
  });
});

describe("removeLoyaltyReward", () => {
  const products = [makeProduct({ id: 1, price: 20, name: "Latte" })];

  it("returns same array if line has no reward", () => {
    const lines = [makeLine()];
    expect(removeLoyaltyReward(lines, 0, products)).toBe(lines);
  });

  it("returns same array if index is invalid", () => {
    const lines = [makeLine({ loyalty_reward: "50_postre" })];
    expect(removeLoyaltyReward(lines, 9, products)).toBe(lines);
  });

  it("merges back into a matching full-price sibling", () => {
    const lines = [
      makeLine({ quantity: 2, subtotal: 24 }),
      makeLine({ quantity: 1, unit_price: 6, subtotal: 6, loyalty_reward: "50_postre" }),
    ];
    const result = removeLoyaltyReward(lines, 1, products);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      quantity: 3,
      unit_price: 12,
      subtotal: 36,
      loyalty_reward: null,
    });
  });

  it("does NOT merge with a sibling that has a different reward", () => {
    const lines = [
      makeLine({ quantity: 1, unit_price: 0, subtotal: 0, loyalty_reward: "bebida_gratis" }),
      makeLine({ quantity: 1, unit_price: 6, subtotal: 6, loyalty_reward: "50_postre" }),
    ];
    const result = removeLoyaltyReward(lines, 1, products);
    expect(result).toHaveLength(2);
    expect(result[1].loyalty_reward).toBeNull();
    expect(result[1].unit_price).toBe(20);
  });

  it("does NOT merge with a sibling with different temperatura", () => {
    const lines = [
      makeLine({ quantity: 2, temperatura: "frío", subtotal: 24 }),
      makeLine({ quantity: 1, unit_price: 6, subtotal: 6, loyalty_reward: "50_postre" }),
    ];
    const result = removeLoyaltyReward(lines, 1, products);
    expect(result).toHaveLength(2);
    expect(result[1].loyalty_reward).toBeNull();
  });

  it("restores using product price when no sibling exists", () => {
    const lines = [
      makeLine({ quantity: 1, unit_price: 6, subtotal: 6, loyalty_reward: "50_postre" }),
    ];
    const result = removeLoyaltyReward(lines, 0, products);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      quantity: 1,
      unit_price: 20,
      subtotal: 20,
      loyalty_reward: null,
    });
  });

  it("falls back to 2× current price when product is missing from catalog", () => {
    const lines = [
      makeLine({
        product_id: 99,
        quantity: 1,
        unit_price: 7,
        subtotal: 7,
        loyalty_reward: "50_postre",
      }),
    ];
    const result = removeLoyaltyReward(lines, 0, products);
    expect(result[0].unit_price).toBe(14);
    expect(result[0].subtotal).toBe(14);
  });
});

describe("getEligibleIndices", () => {
  const categoryTipo = new Map<number, string | null>([
    [10, "bebida"],
    [20, "postre"],
    [30, "comida"],
    [40, null],
  ]);

  it("returns indices of bebidas without reward for bebida_gratis", () => {
    const lines = [
      makeLine({ category_id: 10 }),
      makeLine({ category_id: 20 }),
      makeLine({ category_id: 10 }),
    ];
    expect(getEligibleIndices(lines, "bebida_gratis", categoryTipo)).toEqual([0, 2]);
  });

  it("returns indices of postres without reward for 50_postre", () => {
    const lines = [
      makeLine({ category_id: 10 }),
      makeLine({ category_id: 20 }),
      makeLine({ category_id: 20 }),
    ];
    expect(getEligibleIndices(lines, "50_postre", categoryTipo)).toEqual([1, 2]);
  });

  it("excludes lines that already have a reward", () => {
    const lines = [
      makeLine({ category_id: 10, loyalty_reward: "bebida_gratis" }),
      makeLine({ category_id: 10 }),
    ];
    expect(getEligibleIndices(lines, "bebida_gratis", categoryTipo)).toEqual([1]);
  });

  it("excludes lines without category_id", () => {
    const lines = [makeLine({ category_id: null })];
    expect(getEligibleIndices(lines, "bebida_gratis", categoryTipo)).toEqual([]);
  });

  it("excludes lines whose category tipo doesn't match", () => {
    const lines = [
      makeLine({ category_id: 30 }),
      makeLine({ category_id: 40 }),
    ];
    expect(getEligibleIndices(lines, "bebida_gratis", categoryTipo)).toEqual([]);
  });
});

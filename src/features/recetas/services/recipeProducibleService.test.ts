import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateRecipe, Recipe } from "@/types";
import {
  buildLinkedIngredientRow,
  syncRecipeProducible,
} from "./recipeProducibleService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

function makeFormData(overrides: Partial<CreateRecipe> = {}): CreateRecipe {
  return {
    name: "Brownie",
    description: "x",
    quantity: 12,
    unit_of_measure: "und",
    manufacturing_cost: 30,
    ...overrides,
  } as CreateRecipe;
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 7,
    name: "Brownie",
    quantity: 12,
    unit_of_measure: "und",
    manufacturing_cost: 30,
    ...overrides,
  } as Recipe;
}

function baseParams() {
  return {
    recipe: makeRecipe(),
    formData: makeFormData(),
    userId: "u1",
    userName: "Seba",
  };
}

describe("buildLinkedIngredientRow", () => {
  it("normaliza el nombre, arranca stock en 0 y enlaza el recipe_id", () => {
    const row = buildLinkedIngredientRow(makeFormData({ name: "Pan DE Yuca" }), 42);
    expect(row).toEqual({
      name: "pan de yuca",
      quantity: 12,
      stock_quantity: 0,
      unit_of_measure: "und",
      price: 30,
      recipe_id: 42,
    });
  });
});

describe("syncRecipeProducible", () => {
  beforeEach(() => vi.clearAllMocks());

  it("turn ON (no vinculado): inserta el ingrediente vinculado + audit", async () => {
    const sb = makeMockSupabase();
    sb.setResult("ingredients", { data: null }); // no producible previo
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await syncRecipeProducible({ ...baseParams(), addAsIngredient: true });

    const insert = sb.insertCalls.find((c) => c.table === "ingredients")!;
    expect(insert).toBeDefined();
    expect((insert.payload as Record<string, unknown>).recipe_id).toBe(7);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "convertir_receta_producible" }),
    );
  });

  it("turn OFF con stock > 0: lanza error y NO borra", async () => {
    const sb = makeMockSupabase();
    sb.setResult("ingredients", { data: { id: 5, stock_quantity: 3 } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      syncRecipeProducible({ ...baseParams(), addAsIngredient: false }),
    ).rejects.toThrow(/tiene stock/);

    expect(sb.deleteCalls.find((c) => c.table === "ingredients")).toBeUndefined();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("turn OFF con stock 0: borra el ingrediente vinculado + audit", async () => {
    const sb = makeMockSupabase();
    sb.setResult("ingredients", { data: { id: 5, stock_quantity: 0 } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await syncRecipeProducible({ ...baseParams(), addAsIngredient: false });

    const del = sb.deleteCalls.find((c) => c.table === "ingredients")!;
    expect(del).toBeDefined();
    expect(del.filters).toEqual([["id", 5]]);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quitar_receta_producible" }),
    );
  });

  it("no-op: addAsIngredient=true y ya vinculado → sin cambios", async () => {
    const sb = makeMockSupabase();
    sb.setResult("ingredients", { data: { id: 5, stock_quantity: 0 } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await syncRecipeProducible({ ...baseParams(), addAsIngredient: true });

    expect(sb.insertCalls.find((c) => c.table === "ingredients")).toBeUndefined();
    expect(sb.deleteCalls.find((c) => c.table === "ingredients")).toBeUndefined();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

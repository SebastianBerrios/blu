import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateRecipe, Recipe } from "@/types";
import type { RecipeSubmitParams, RecipeIngredientLine } from "../types";
import {
  createRecipe,
  updateRecipe,
  updateRecipeIngredientsOnly,
} from "./recipesService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

function makeFormData(overrides: Partial<CreateRecipe> = {}): CreateRecipe {
  return {
    name: "Pan de yuca",
    description: "Receta clásica",
    quantity: 10,
    unit_of_measure: "und",
    manufacturing_cost: 25,
    ...overrides,
  } as CreateRecipe;
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 7,
    name: "Pan de yuca",
    description: "x",
    quantity: 10,
    unit_of_measure: "und",
    manufacturing_cost: 25,
    ...overrides,
  } as Recipe;
}

function makeIngredient(): RecipeIngredientLine {
  return {
    ingredient_id: 1,
    ingredient_name: "Harina",
    quantity: 200,
    unit_of_measure: "g",
    ingredient_price: 30,
    ingredient_unit: "kg",
    ingredient_quantity_stock: 1,
  };
}

function makeParams(
  overrides: Partial<RecipeSubmitParams> = {},
): RecipeSubmitParams {
  return {
    formData: makeFormData(),
    ingredients: [makeIngredient()],
    originalIngredients: [],
    userId: "u1",
    userName: "Seba",
    ...overrides,
  };
}

describe("createRecipe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path básico: insert recipes + rpc replace_recipe_ingredients (no direct insert/delete)", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 99 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createRecipe(makeParams());

    const recipesInsert = sb.insertCalls.find((c) => c.table === "recipes")!;
    expect((recipesInsert.payload as Record<string, unknown>).name).toBe("pan de yuca");

    // RPC called for ingredient replacement
    const rpcCall = sb.rpcCalls.find((c) => c.fn === "replace_recipe_ingredients");
    expect(rpcCall).toBeDefined();
    expect((rpcCall!.params as Record<string, unknown>).p_recipe_id).toBe(99);
    const rpcIngredients = (rpcCall!.params as Record<string, unknown>).p_ingredients as Array<Record<string, unknown>>;
    expect(rpcIngredients).toHaveLength(1);

    // No direct delete or insert on recipe_ingredients
    expect(sb.deleteCalls.find((c) => c.table === "recipe_ingredients")).toBeUndefined();
    expect(sb.insertCalls.find((c) => c.table === "recipe_ingredients")).toBeUndefined();

    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("addAsIngredient=true: además inserta en ingredients con recipe_id", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 99 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createRecipe(makeParams({ addAsIngredient: true }));

    const ingredientInsert = sb.insertCalls.find((c) => c.table === "ingredients");
    expect(ingredientInsert).toBeDefined();
    const payload = ingredientInsert!.payload as Record<string, unknown>;
    expect(payload.recipe_id).toBe(99);
    expect(payload.stock_quantity).toBe(0);
  });

  it("productId: actualiza products con recipe_id + manufacturing_cost unitario + audit", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 99 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createRecipe(makeParams({ productId: 42 }));

    // products update
    const productsUpdate = sb.updateCalls.find((c) => c.table === "products")!;
    const payload = productsUpdate.payload as Record<string, unknown>;
    expect(payload.recipe_id).toBe(99);
    expect(payload.manufacturing_cost).toBe(2.5); // 25 / 10 = 2.5
    expect(productsUpdate.filters).toEqual([["id", 42]]);

    // audit log
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crear_receta_producto",
        targetTable: "recipes",
        targetId: 99,
      }),
    );
  });

  it("productId con quantity=0: unitCost queda en 0", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 99 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createRecipe(
      makeParams({
        formData: makeFormData({ quantity: 0 }),
        productId: 42,
      }),
    );

    const productsUpdate = sb.updateCalls.find((c) => c.table === "products")!;
    expect((productsUpdate.payload as Record<string, unknown>).manufacturing_cost).toBe(0);
  });

  it("error en insert recipes: propaga sin tocar ingredients", async () => {
    const sb = makeMockSupabase({
      single: { data: null, error: { message: "RLS denied" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createRecipe(makeParams())).rejects.toBeTruthy();
    expect(sb.rpcCalls.find((c) => c.fn === "replace_recipe_ingredients")).toBeUndefined();
  });

  it("rpc error propagates: si replace_recipe_ingredients falla, se lanza el error", async () => {
    const sb = makeMockSupabase({
      single: { data: { id: 99 }, error: null },
      rpc: { data: null, error: { message: "FK violation" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createRecipe(makeParams())).rejects.toBeTruthy();
  });
});

describe("updateRecipe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update recipes + update ingredients (recipe_id) + rpc replace_recipe_ingredients (no direct delete/insert)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateRecipe(makeParams({ recipe: makeRecipe() }));

    expect(sb.updateCalls.find((c) => c.table === "recipes")).toBeDefined();
    expect(sb.updateCalls.find((c) => c.table === "ingredients")).toBeDefined();

    // RPC called instead of delete + insert
    const rpcCall = sb.rpcCalls.find((c) => c.fn === "replace_recipe_ingredients");
    expect(rpcCall).toBeDefined();
    expect((rpcCall!.params as Record<string, unknown>).p_recipe_id).toBe(7);

    // No direct delete or insert on recipe_ingredients
    expect(sb.deleteCalls.find((c) => c.table === "recipe_ingredients")).toBeUndefined();
    expect(sb.insertCalls.find((c) => c.table === "recipe_ingredients")).toBeUndefined();
  });

  it("throws si no hay recipe", async () => {
    await expect(updateRecipe(makeParams({ recipe: undefined }))).rejects.toThrow(
      "Recipe is required",
    );
  });

  it("rpc error propagates: si replace_recipe_ingredients falla, se lanza el error", async () => {
    const sb = makeMockSupabase({
      rpc: { data: null, error: { message: "FK violation" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      updateRecipe(makeParams({ recipe: makeRecipe() })),
    ).rejects.toBeTruthy();
  });
});

describe("updateRecipeIngredientsOnly", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: update recipes.cost + rpc replace_recipe_ingredients + update ingredients.price + audit (no direct delete/insert)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateRecipeIngredientsOnly(
      makeParams({
        recipe: makeRecipe(),
        productId: 42,
        originalIngredients: [],
      }),
    );

    expect(sb.updateCalls.find((c) => c.table === "recipes")).toBeDefined();

    // RPC called instead of delete + insert
    const rpcCall = sb.rpcCalls.find((c) => c.fn === "replace_recipe_ingredients");
    expect(rpcCall).toBeDefined();
    expect((rpcCall!.params as Record<string, unknown>).p_recipe_id).toBe(7);

    // No direct delete or insert on recipe_ingredients
    expect(sb.deleteCalls.find((c) => c.table === "recipe_ingredients")).toBeUndefined();
    expect(sb.insertCalls.find((c) => c.table === "recipe_ingredients")).toBeUndefined();

    expect(sb.updateCalls.find((c) => c.table === "ingredients")).toBeDefined();
    expect(sb.updateCalls.find((c) => c.table === "products")).toBeDefined();
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "editar_ingredientes_receta" }),
    );
  });

  it("sin productId: NO actualiza products", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateRecipeIngredientsOnly(
      makeParams({ recipe: makeRecipe(), originalIngredients: [] }),
    );

    expect(sb.updateCalls.find((c) => c.table === "products")).toBeUndefined();
  });

  it("throws si no hay recipe", async () => {
    await expect(
      updateRecipeIngredientsOnly(makeParams({ recipe: undefined })),
    ).rejects.toThrow("Recipe is required");
  });

  it("rpc error propagates: si replace_recipe_ingredients falla, se lanza el error", async () => {
    const sb = makeMockSupabase({
      rpc: { data: null, error: { message: "atomic failure" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      updateRecipeIngredientsOnly(
        makeParams({ recipe: makeRecipe(), originalIngredients: [] }),
      ),
    ).rejects.toBeTruthy();
  });
});

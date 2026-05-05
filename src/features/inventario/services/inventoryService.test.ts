import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ingredient } from "@/types";
import {
  adjustInventory,
  toggleNeedsPurchase,
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  assignIngredientGroup,
} from "./inventoryService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

function ingredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 7,
    name: "Harina",
    quantity: 1,
    unit_of_measure: "kg",
    price: 30,
    group_id: null,
    needs_purchase: false,
    recipe_id: null,
    stock_quantity: 5,
    ...overrides,
  } as Ingredient;
}

describe("adjustInventory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update stock + insert movement + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await adjustInventory(ingredient(), 12, "u1", "Seba");

    expect(sb.updateCalls.find((c) => c.table === "ingredients")).toBeDefined();
    const movInsert = sb.insertCalls.find((c) => c.table === "inventory_movements")!;
    const payload = movInsert.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      ingredient_id: 7,
      old_quantity: 5,
      new_quantity: 12,
      reason: "manual",
    });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ajustar_inventario",
        targetDescription: expect.stringContaining("5 → 12 kg"),
      }),
    );
  });

  it("error en update: propaga sin insert ni audit", async () => {
    const sb = makeMockSupabase();
    sb.setResult("ingredients", { error: { message: "x" } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(adjustInventory(ingredient(), 10, null, null)).rejects.toBeTruthy();
    expect(sb.insertCalls).toHaveLength(0);
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

describe("toggleNeedsPurchase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update con needs_purchase y filter id", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await toggleNeedsPurchase(7, true);
    expect(sb.updateCalls[0]).toMatchObject({
      table: "ingredients",
      payload: { needs_purchase: true },
      filters: [["id", 7]],
    });
  });
});

describe("fetchGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna data ordenada por name", async () => {
    const sb = makeMockSupabase();
    sb.setResult("ingredient_groups", {
      data: [{ id: 1, name: "A" }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    expect(await fetchGroups()).toEqual([{ id: 1, name: "A" }]);
  });
});

describe("createGroup / updateGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createGroup inserta name", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await createGroup("Lácteos");
    expect(sb.insertCalls).toEqual([
      { table: "ingredient_groups", payload: { name: "Lácteos" } },
    ]);
  });

  it("updateGroup actualiza con id", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await updateGroup(5, "Bebidas");
    expect(sb.updateCalls[0]).toMatchObject({
      payload: { name: "Bebidas" },
      filters: [["id", 5]],
    });
  });
});

describe("deleteGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delete + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await deleteGroup(3, "u1", "Seba", "Lácteos");
    expect(sb.deleteCalls[0]).toMatchObject({
      table: "ingredient_groups",
      filters: [["id", 3]],
    });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "eliminar",
        targetDescription: "Lácteos",
      }),
    );
  });
});

describe("assignIngredientGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update group_id con valor", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await assignIngredientGroup(7, 3);
    expect(sb.updateCalls[0]).toMatchObject({
      table: "ingredients",
      payload: { group_id: 3 },
      filters: [["id", 7]],
    });
  });

  it("update group_id con null (desasignar)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await assignIngredientGroup(7, null);
    expect(
      (sb.updateCalls[0].payload as Record<string, unknown>).group_id,
    ).toBeNull();
  });
});

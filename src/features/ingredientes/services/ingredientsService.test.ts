import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateIngredient } from "@/types";
import {
  buildIngredientPayload,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "./ingredientsService";
import { createClient } from "@/utils/supabase/client";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/helpers/deleteWithAudit", () => ({ deleteWithAudit: vi.fn() }));

const mockedDeleteWithAudit = vi.mocked(deleteWithAudit);

function makeData(overrides: Partial<CreateIngredient> = {}): CreateIngredient {
  return {
    name: "Harina",
    quantity: 1,
    unit_of_measure: "kg",
    price: 30,
    group_id: null,
    ...overrides,
  } as CreateIngredient;
}

describe("buildIngredientPayload", () => {
  it("normaliza name a lowercase + parsea numéricos", () => {
    const payload = buildIngredientPayload(
      makeData({
        name: "HARINA Premium",
        quantity: "2.5" as unknown as number,
        price: "30" as unknown as number,
      }),
    );
    expect(payload).toMatchObject({
      name: "harina premium",
      quantity: 2.5,
      price: 30,
    });
  });

  it("group_id null queda null", () => {
    expect(buildIngredientPayload(makeData({ group_id: null })).group_id).toBeNull();
  });

  it("group_id en string se convierte a número", () => {
    const payload = buildIngredientPayload(
      makeData({ group_id: "5" as unknown as number }),
    );
    expect(payload.group_id).toBe(5);
  });
});

describe("createIngredient / updateIngredient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createIngredient inserta en ingredients", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    const payload = buildIngredientPayload(makeData());
    await createIngredient(payload);
    expect(sb.insertCalls).toEqual([{ table: "ingredients", payload }]);
  });

  it("updateIngredient hace update con .eq('id', n)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    const payload = buildIngredientPayload(makeData());
    await updateIngredient(13, payload);
    expect(sb.updateCalls[0]).toMatchObject({
      table: "ingredients",
      filters: [["id", 13]],
    });
  });
});

describe("deleteIngredient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delega a deleteWithAudit con descripción", async () => {
    await deleteIngredient({
      id: 88,
      name: "Azúcar",
      userId: null,
      userName: null,
    });
    expect(mockedDeleteWithAudit).toHaveBeenCalledWith({
      table: "ingredients",
      id: 88,
      userId: null,
      userName: null,
      auditTable: "ingredients",
      description: "Ingrediente eliminado: Azúcar",
    });
  });
});

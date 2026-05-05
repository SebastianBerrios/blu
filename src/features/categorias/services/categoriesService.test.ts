import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCategoryPayload,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categoriesService";
import { createClient } from "@/utils/supabase/client";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/helpers/deleteWithAudit", () => ({ deleteWithAudit: vi.fn() }));

const mockedDeleteWithAudit = vi.mocked(deleteWithAudit);

describe("buildCategoryPayload", () => {
  it("normaliza name a lowercase", () => {
    expect(
      buildCategoryPayload({ name: "POSTRES Especiales", tipo: null }),
    ).toEqual({ name: "postres especiales", tipo: null });
  });

  it("conserva tipo cuando es 'postre' o 'bebida'", () => {
    expect(buildCategoryPayload({ name: "x", tipo: "postre" }).tipo).toBe("postre");
    expect(buildCategoryPayload({ name: "x", tipo: "bebida" }).tipo).toBe("bebida");
  });

  it("setea tipo=null para valores no válidos", () => {
    expect(
      buildCategoryPayload({
        name: "x",
        tipo: "comida" as unknown as "postre" | "bebida",
      }).tipo,
    ).toBeNull();
    expect(buildCategoryPayload({ name: "x", tipo: null }).tipo).toBeNull();
  });
});

describe("createCategory / updateCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createCategory inserta en categories", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await createCategory({ name: "bebidas", tipo: "bebida" });
    expect(sb.insertCalls).toEqual([
      { table: "categories", payload: { name: "bebidas", tipo: "bebida" } },
    ]);
  });

  it("updateCategory hace update con .eq('id', n)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await updateCategory(7, { name: "postres", tipo: "postre" });
    expect(sb.updateCalls).toEqual([
      {
        table: "categories",
        payload: { name: "postres", tipo: "postre" },
        filters: [["id", 7]],
      },
    ]);
  });

  it("createCategory propaga error", async () => {
    const sb = makeMockSupabase();
    sb.setResult("categories", { error: { message: "RLS" } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    await expect(createCategory({ name: "x", tipo: null })).rejects.toBeTruthy();
  });
});

describe("deleteCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delega a deleteWithAudit con descripción correcta", async () => {
    await deleteCategory({ id: 5, name: "Postres", userId: "u1", userName: "Seba" });
    expect(mockedDeleteWithAudit).toHaveBeenCalledWith({
      table: "categories",
      id: 5,
      userId: "u1",
      userName: "Seba",
      auditTable: "categories",
      description: "Categoría eliminada: Postres",
    });
  });
});

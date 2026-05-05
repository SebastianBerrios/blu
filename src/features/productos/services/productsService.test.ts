import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateProduct } from "@/types";
import {
  buildProductPayload,
  createProduct,
  updateProduct,
} from "./productsService";
import { createClient } from "@/utils/supabase/client";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));

function makeData(overrides: Partial<CreateProduct> = {}): CreateProduct {
  return {
    name: "Latte",
    categoryId: 10,
    price: 12,
    manufacturing_cost: 5,
    rappi_price: null,
    temperatura: null,
    tipo_leche: null,
    ...overrides,
  } as CreateProduct;
}

describe("buildProductPayload", () => {
  it("normaliza name a lowercase + parsea numéricos", () => {
    const payload = buildProductPayload(
      makeData({
        name: "LATTE Vainilla",
        price: "12.5" as unknown as number,
        manufacturing_cost: "3" as unknown as number,
      }),
      15,
      99,
    );
    expect(payload.name).toBe("latte vainilla");
    expect(payload.price).toBe(12.5);
    expect(payload.manufacturing_cost).toBe(3);
    expect(payload.suggested_price).toBe(15);
    expect(payload.recipe_id).toBe(99);
  });

  it("rappi_price queda null si raw es null/undefined/string vacío", () => {
    expect(
      buildProductPayload(makeData({ rappi_price: null }), 12, null).rappi_price,
    ).toBeNull();
    expect(
      buildProductPayload(makeData({ rappi_price: "" as unknown as number }), 12, null)
        .rappi_price,
    ).toBeNull();
  });

  it("rappi_price queda null si es 0 o negativo", () => {
    expect(
      buildProductPayload(makeData({ rappi_price: 0 }), 12, null).rappi_price,
    ).toBeNull();
    expect(
      buildProductPayload(makeData({ rappi_price: -5 }), 12, null).rappi_price,
    ).toBeNull();
  });

  it("rappi_price se preserva si > 0", () => {
    expect(
      buildProductPayload(makeData({ rappi_price: 18 }), 12, null).rappi_price,
    ).toBe(18);
  });

  it("manufacturing_cost default 0 cuando es null/undefined", () => {
    const payload = buildProductPayload(
      makeData({ manufacturing_cost: null }),
      12,
      null,
    );
    expect(payload.manufacturing_cost).toBe(0);
  });

  it("temperatura/tipo_leche en string vacío → null", () => {
    const payload = buildProductPayload(
      makeData({ temperatura: "", tipo_leche: "" }),
      12,
      null,
    );
    expect(payload.temperatura).toBeNull();
    expect(payload.tipo_leche).toBeNull();
  });
});

describe("createProduct / updateProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createProduct inserta en products", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    const payload = buildProductPayload(makeData(), 12, null);
    await createProduct(payload);
    expect(sb.insertCalls).toEqual([{ table: "products", payload }]);
  });

  it("updateProduct hace update con .eq('id', n)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    const payload = buildProductPayload(makeData(), 12, null);
    await updateProduct(42, payload);
    expect(sb.updateCalls).toEqual([
      { table: "products", payload, filters: [["id", 42]] },
    ]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Product } from "@/types";
import { toggleProductAvailability } from "./productAvailabilityService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 7,
    name: "Latte",
    category_id: 1,
    price: 12,
    manufacturing_cost: 5,
    suggested_price: 12,
    rappi_price: null,
    temperatura: null,
    tipo_leche: null,
    recipe_id: null,
    is_available: true,
    ...overrides,
  } as Product;
}

describe("toggleProductAvailability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update is_available + audit con descripción 'Disponible'", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleProductAvailability(product(), true, "u1", "Seba");

    expect(sb.updateCalls).toEqual([
      {
        table: "products",
        payload: { is_available: true },
        filters: [["id", 7]],
      },
    ]);
    expect(mockedLogAudit).toHaveBeenCalledWith({
      userId: "u1",
      userName: "Seba",
      action: "cambiar_disponibilidad",
      targetTable: "products",
      targetId: 7,
      targetDescription: "Latte: Disponible",
    });
  });

  it("descripción dice 'No disponible' cuando newValue=false", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleProductAvailability(product({ name: "Mojito" }), false, null, null);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetDescription: "Mojito: No disponible",
      }),
    );
  });

  it("propaga error si update falla y no hace audit", async () => {
    const sb = makeMockSupabase();
    sb.setResult("products", { error: { message: "RLS denied" } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      toggleProductAvailability(product(), true, null, null),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

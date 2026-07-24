import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPurchaseNumber } from "./purchaseNumber";
import { createClient } from "@/utils/supabase/client";

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}));

interface MockPurchaseNumberResult {
  data: { purchase_number: number | null } | null;
  error: unknown;
}

function buildMockClient(result: MockPurchaseNumberResult) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq, single };
}

describe("getPurchaseNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns purchase_number from the purchases row", async () => {
    const mock = buildMockClient({ data: { purchase_number: 42 }, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getPurchaseNumber(123)).toBe(42);
  });

  it("falls back to purchaseId when purchase_number is null", async () => {
    const mock = buildMockClient({ data: { purchase_number: null }, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getPurchaseNumber(7)).toBe(7);
  });

  it("falls back to purchaseId when data row is null", async () => {
    const mock = buildMockClient({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getPurchaseNumber(5)).toBe(5);
  });

  it("falls back to purchaseId on Supabase error", async () => {
    const mock = buildMockClient({ data: null, error: { message: "not found" } });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getPurchaseNumber(9)).toBe(9);
  });

  it("queries purchases table selecting purchase_number filtered by id via .single()", async () => {
    const mock = buildMockClient({ data: { purchase_number: 1 }, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    await getPurchaseNumber(99);
    expect(mock.from).toHaveBeenCalledWith("purchases");
    expect(mock.select).toHaveBeenCalledWith("purchase_number");
    expect(mock.eq).toHaveBeenCalledWith("id", 99);
    expect(mock.single).toHaveBeenCalled();
  });
});

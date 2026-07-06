import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSaleNumber } from "./saleNumber";
import { createClient } from "@/utils/supabase/client";

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}));

interface MockSaleNumberResult {
  data: { sale_number: number | null } | null;
  error: unknown;
}

function buildMockClient(result: MockSaleNumberResult) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq, single };
}

describe("getSaleNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sale_number from the sales row", async () => {
    const mock = buildMockClient({ data: { sale_number: 42 }, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getSaleNumber(123)).toBe(42);
  });

  it("falls back to saleId when sale_number is null", async () => {
    const mock = buildMockClient({ data: { sale_number: null }, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getSaleNumber(7)).toBe(7);
  });

  it("falls back to saleId when data row is null", async () => {
    const mock = buildMockClient({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getSaleNumber(5)).toBe(5);
  });

  it("falls back to saleId on Supabase error", async () => {
    const mock = buildMockClient({ data: null, error: { message: "not found" } });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getSaleNumber(9)).toBe(9);
  });

  it("queries sales table selecting sale_number filtered by id via .single()", async () => {
    const mock = buildMockClient({ data: { sale_number: 1 }, error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    await getSaleNumber(99);
    expect(mock.from).toHaveBeenCalledWith("sales");
    expect(mock.select).toHaveBeenCalledWith("sale_number");
    expect(mock.eq).toHaveBeenCalledWith("id", 99);
    expect(mock.single).toHaveBeenCalled();
  });
});

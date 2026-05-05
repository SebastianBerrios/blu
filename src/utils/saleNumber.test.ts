import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSaleNumber } from "./saleNumber";
import { createClient } from "@/utils/supabase/client";

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}));

interface MockResult {
  count: number | null;
}

function buildMockClient(result: MockResult) {
  const lte = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ lte }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, lte };
}

describe("getSaleNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the count from Supabase", async () => {
    const mock = buildMockClient({ count: 42 });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getSaleNumber(123)).toBe(42);
  });

  it("falls back to saleId when count is null", async () => {
    const mock = buildMockClient({ count: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getSaleNumber(7)).toBe(7);
  });

  it("queries the sales table with head:true count + lte filter", async () => {
    const mock = buildMockClient({ count: 1 });
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    await getSaleNumber(99);
    expect(mock.from).toHaveBeenCalledWith("sales");
    expect(mock.select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(mock.lte).toHaveBeenCalledWith("id", 99);
  });
});

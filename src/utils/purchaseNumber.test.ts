import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPurchaseNumber } from "./purchaseNumber";
import { createClient } from "@/utils/supabase/client";

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}));

function buildMockClient(count: number | null) {
  const lte = vi.fn().mockResolvedValue({ count });
  const select = vi.fn(() => ({ lte }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, lte };
}

describe("getPurchaseNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the count from Supabase", async () => {
    const mock = buildMockClient(15);
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getPurchaseNumber(50)).toBe(15);
  });

  it("falls back to purchaseId when count is null", async () => {
    const mock = buildMockClient(null);
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    expect(await getPurchaseNumber(11)).toBe(11);
  });

  it("queries the purchases table with head:true count + lte filter", async () => {
    const mock = buildMockClient(1);
    vi.mocked(createClient).mockReturnValue(mock.client as never);
    await getPurchaseNumber(77);
    expect(mock.from).toHaveBeenCalledWith("purchases");
    expect(mock.select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(mock.lte).toHaveBeenCalledWith("id", 77);
  });
});

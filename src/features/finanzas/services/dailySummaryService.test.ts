/**
 * T1.2 — TDD: tests for dailySummaryService TZ and round2 fixes (Phase 1, T1.8).
 * fetchDailySummary_limaTimezone: FAILS until T1.8 replaces localDayRangeISO → limaDayRangeISO.
 * fetchDailySummary_round2: FAILS until T1.8 applies round2 to closingBalance/net accumulators.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDailySummary } from "./dailySummaryService";
import { createClient } from "@/utils/supabase/client";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));

// Lima is UTC-5. A date key of "2026-07-06" Lima means the UTC range
// [2026-07-06T05:00:00.000Z, 2026-07-07T04:59:59.999Z].
const LIMA_DATE_KEY = "2026-07-06";
const LIMA_START = "2026-07-06T05:00:00.000Z";
const LIMA_END = "2026-07-07T04:59:59.999Z";

// Helper to build a Supabase mock that captures the gte/lte filter calls
// and returns empty data so the service can complete without crashing.
// Returns all queries in order so callers can pick the right one.
function makeServiceMock() {
  const allQueries: Array<{ table: string; gte?: string; lte?: string; gt?: string }> = [];

  const sb = makeMockSupabase();

  // Override from() to intercept the filters used for transactions/sales/purchases
  sb.from.mockImplementation((table: string) => {
    const captured: { table: string; gte?: string; lte?: string; gt?: string } = { table };
    allQueries.push(captured);

    const chain: Record<string, unknown> = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn((_col: string, val: string) => {
        captured.gte = val;
        return chain;
      }),
      lte: vi.fn((_col: string, val: string) => {
        captured.lte = val;
        return chain;
      }),
      gt: vi.fn((_col: string, val: string) => {
        captured.gt = val;
        return chain;
      }),
      order: vi.fn(() => chain),
      not: vi.fn(() => chain),
      in: vi.fn(() => chain),
      // Resolve to empty data so the service doesn't crash
      then: (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled),
    };
    return chain;
  });

  return { sb, allQueries };
}

describe("fetchDailySummary — Lima timezone (T1.8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchDailySummary_limaTimezone: uses Lima-anchored UTC range (not local TZ) for transactions day query", async () => {
    const { sb, allQueries } = makeServiceMock();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await fetchDailySummary(LIMA_DATE_KEY);

    // The service queries transactions twice: once for the day range (gte+lte)
    // and once for postTransactions (gt only). Find the one with a lte set.
    const txDayQuery = allQueries.find((q) => q.table === "transactions" && q.lte !== undefined);
    expect(txDayQuery).toBeDefined();

    // Must use limaDayRangeISO bounds, not localDayRangeISO.
    // Lima is UTC-5: 2026-07-06 00:00 Lima = 2026-07-06T05:00:00.000Z.
    expect(txDayQuery?.gte).toBe(LIMA_START);
    expect(txDayQuery?.lte).toBe(LIMA_END);
  });

  it("fetchDailySummary_limaTimezone: uses Lima-anchored UTC range for sales query", async () => {
    const { sb, allQueries } = makeServiceMock();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await fetchDailySummary(LIMA_DATE_KEY);

    const salesQuery = allQueries.find((q) => q.table === "sales");
    expect(salesQuery).toBeDefined();
    expect(salesQuery?.gte).toBe(LIMA_START);
    expect(salesQuery?.lte).toBe(LIMA_END);
  });
});

describe("fetchDailySummary — round2 on money accumulators (T1.8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchDailySummary_round2: closingBalance and net are rounded to 2 decimal places", async () => {
    // Craft transactions that produce a float: 0.1 + 0.2 = 0.30000000000000004
    const sb = makeMockSupabase();

    sb.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        gt: vi.fn(() => chain),
        order: vi.fn(() => chain),
        not: vi.fn(() => chain),
        in: vi.fn(() => chain),
        then: (onFulfilled: (v: { data: unknown; error: null }) => unknown) => {
          let data: unknown = [];

          if (table === "accounts") {
            data = [
              { id: 1, name: "Caja", type: "caja", balance: 500.20000000000004 },
            ];
          } else if (table === "transactions") {
            // Two ingresos: 0.1 and 0.2 → sum should round to 0.30
            data = [
              { account_id: 1, amount: 0.1, created_at: LIMA_START },
              { account_id: 1, amount: 0.2, created_at: LIMA_START },
            ];
          }

          return Promise.resolve({ data, error: null }).then(onFulfilled);
        },
      };
      return chain;
    });

    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await fetchDailySummary(LIMA_DATE_KEY);

    // net = 0.1 + 0.2 = 0.30000000000000004 without round2; expect 0.30 with it
    const caja = result.perAccount.find((a) => a.accountId === 1);
    expect(caja).toBeDefined();
    // net should be clean (no floating point noise)
    const netStr = caja!.net.toString();
    expect(netStr).not.toContain("00000000000000"); // no float noise like 0.30000...004

    // closingBalance also should be clean
    const cbStr = caja!.closingBalance.toString();
    expect(cbStr).not.toContain("00000000000000");
  });
});

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

    // The service queries transactions once, for the day range (gte+lte).
    // Post-day balances now come from the get_account_after_sums RPC.
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

// ---------------------------------------------------------------------------
// T3.3 extensions — closingBalance formula + net/ingresos/egresos aggregation
// ---------------------------------------------------------------------------

/**
 * Build a mock that returns controlled data for each table.
 * accounts: one account with balance=currentBalance
 * transactions (day range, gte+lte): the provided dayTransactions
 * transactions (post-day, gt only): the provided postTransactions
 * All other tables return [].
 */
function makeSummaryDataMock(opts: {
  currentBalance: number;
  dayTransactions: Array<{ account_id: number; amount: number; created_at: string }>;
  postTransactions: Array<{ account_id: number; amount: number }>;
}) {
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
          data = [{ id: 1, name: "Caja", type: "caja", balance: opts.currentBalance }];
        } else if (table === "transactions") {
          data = opts.dayTransactions;
        }

        return Promise.resolve({ data, error: null }).then(onFulfilled);
      },
    };
    return chain;
  });

  // Post-day balances now come from the get_account_after_sums RPC (server-side
  // aggregation), so expose the sum-per-account that the query would return.
  const afterSums = new Map<number, number>();
  for (const t of opts.postTransactions) {
    afterSums.set(t.account_id, (afterSums.get(t.account_id) ?? 0) + t.amount);
  }
  sb.setRpcResult("get_account_after_sums", {
    data: [...afterSums.entries()].map(([account_id, after_sum]) => ({ account_id, after_sum })),
    error: null,
  });

  return sb;
}

describe("fetchDailySummary — closingBalance formula (T3.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closingBalance = currentBalance minus sum of postTransactions for the account", async () => {
    // currentBalance = 500, postTransactions sum = 75 → closingBalance = 425
    const sb = makeSummaryDataMock({
      currentBalance: 500,
      dayTransactions: [],
      postTransactions: [
        { account_id: 1, amount: 50 },
        { account_id: 1, amount: 25 },
      ],
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await fetchDailySummary(LIMA_DATE_KEY);

    const caja = result.perAccount.find((a) => a.accountId === 1);
    expect(caja).toBeDefined();
    expect(caja!.closingBalance).toBe(425);
    expect(caja!.currentBalance).toBe(500);
  });

  it("closingBalance equals currentBalance when there are no postTransactions", async () => {
    const sb = makeSummaryDataMock({
      currentBalance: 320.5,
      dayTransactions: [],
      postTransactions: [],
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await fetchDailySummary(LIMA_DATE_KEY);

    const caja = result.perAccount.find((a) => a.accountId === 1);
    expect(caja!.closingBalance).toBe(320.5);
  });

  it("postTransactions from other accounts do NOT affect this account's closingBalance", async () => {
    const sb = makeSummaryDataMock({
      currentBalance: 200,
      dayTransactions: [],
      postTransactions: [
        { account_id: 2, amount: 100 }, // different account
      ],
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await fetchDailySummary(LIMA_DATE_KEY);

    const caja = result.perAccount.find((a) => a.accountId === 1);
    expect(caja!.closingBalance).toBe(200); // unaffected by account 2's postTx
  });
});

describe("fetchDailySummary — net/ingresos/egresos aggregation (T3.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ingresos = sum of positive transaction amounts (round2 applied)", async () => {
    const sb = makeSummaryDataMock({
      currentBalance: 1000,
      dayTransactions: [
        { account_id: 1, amount: 100, created_at: LIMA_START },
        { account_id: 1, amount: 50, created_at: LIMA_START },
        { account_id: 1, amount: -30, created_at: LIMA_START }, // egreso, not counted
      ],
      postTransactions: [],
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await fetchDailySummary(LIMA_DATE_KEY);

    const caja = result.perAccount.find((a) => a.accountId === 1);
    expect(caja!.ingresos).toBe(150);
    expect(caja!.egresos).toBe(30);
    expect(caja!.net).toBe(120);
  });

  it("egresos uses Math.abs (stored as negative amounts)", async () => {
    const sb = makeSummaryDataMock({
      currentBalance: 500,
      dayTransactions: [
        { account_id: 1, amount: -75, created_at: LIMA_START },
        { account_id: 1, amount: -25, created_at: LIMA_START },
      ],
      postTransactions: [],
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await fetchDailySummary(LIMA_DATE_KEY);

    const caja = result.perAccount.find((a) => a.accountId === 1);
    expect(caja!.ingresos).toBe(0);
    expect(caja!.egresos).toBe(100); // abs(-75) + abs(-25) = 100
    expect(caja!.net).toBe(-100); // net = ingresos - egresos = 0 - 100
  });

  it("totalIngresos, totalEgresos, totalNet aggregate across all accounts", async () => {
    // Two-account scenario via a fresh mock override
    const sb = makeMockSupabase();
    let transactionsCallCount = 0;

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
              { id: 1, name: "Caja", type: "caja", balance: 1000 },
              { id: 2, name: "Banco", type: "banco", balance: 2000 },
            ];
          } else if (table === "transactions") {
            transactionsCallCount += 1;
            if (transactionsCallCount === 1) {
              // Day transactions: account 1 → +100, account 2 → +200
              data = [
                { account_id: 1, amount: 100, created_at: LIMA_START },
                { account_id: 2, amount: 200, created_at: LIMA_START },
              ];
            }
            // post-day transactions: empty
          }
          return Promise.resolve({ data, error: null }).then(onFulfilled);
        },
      };
      return chain;
    });

    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await fetchDailySummary(LIMA_DATE_KEY);

    expect(result.totalIngresos).toBe(300); // 100 + 200
    expect(result.totalEgresos).toBe(0);
    expect(result.totalNet).toBe(300);
  });

  it("limaDayRangeISO start/end is used for the purchases query too", async () => {
    const { sb, allQueries } = makeServiceMock();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await fetchDailySummary(LIMA_DATE_KEY);

    const purchasesQuery = allQueries.find((q) => q.table === "purchases");
    expect(purchasesQuery).toBeDefined();
    expect(purchasesQuery?.gte).toBe(LIMA_START);
    expect(purchasesQuery?.lte).toBe(LIMA_END);
  });
});

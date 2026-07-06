/**
 * T3.4 — Tests for recordTransaction accountId guard.
 *
 * Per project memory "Validación accountId en servicios financieros":
 * recordTransaction MUST throw if accountId is null/invalid — never silently
 * call the RPC with a null account id, as that would create orphan transactions.
 *
 * BUG FOUND: The current implementation has `accountId: number` in its TypeScript
 * signature but NO runtime guard. A caller that passes null (coerced via `as number`
 * or from an unvalidated lookup) will silently forward null to the RPC
 * p_account_id — the DB may create a transaction with a null account or throw a
 * FK violation, neither of which is caught client-side before the round-trip.
 *
 * FIX: Add an early `if (!params.accountId) throw new Error(...)` guard at the
 * top of recordTransaction (minimal — one line).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordTransaction } from "./useTransactions";
import { createClient } from "@/utils/supabase/client";
import { makeMockSupabase } from "@/__tests__/mockSupabase";
import type { TransactionType } from "@/types";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));

const VALID_TYPE: TransactionType = "ingreso_venta";

describe("recordTransaction — accountId guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws immediately when accountId is null (not forwarded to RPC)", async () => {
    const sb = makeMockSupabase({ rpc: { data: 1, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      recordTransaction({
        accountId: null as unknown as number,
        type: VALID_TYPE,
        amount: 100,
      }),
    ).rejects.toThrow();

    // The RPC must NOT have been called — guard fires before network
    expect(sb.rpcCalls.find((c) => c.fn === "record_transaction")).toBeUndefined();
  });

  it("throws immediately when accountId is 0 (falsy — invalid id)", async () => {
    const sb = makeMockSupabase({ rpc: { data: 1, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      recordTransaction({
        accountId: 0,
        type: VALID_TYPE,
        amount: 50,
      }),
    ).rejects.toThrow();

    expect(sb.rpcCalls.find((c) => c.fn === "record_transaction")).toBeUndefined();
  });

  it("throws immediately when accountId is undefined (missing field coerced)", async () => {
    const sb = makeMockSupabase({ rpc: { data: 1, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      recordTransaction({
        accountId: undefined as unknown as number,
        type: VALID_TYPE,
        amount: 200,
      }),
    ).rejects.toThrow();

    expect(sb.rpcCalls.find((c) => c.fn === "record_transaction")).toBeUndefined();
  });

  it("calls record_transaction RPC with correct params when accountId is valid", async () => {
    const sb = makeMockSupabase({ rpc: { data: 42, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await recordTransaction({
      accountId: 5,
      type: VALID_TYPE,
      amount: 75.5,
      description: "Venta #101",
      referenceId: 101,
      referenceType: "sale",
      categoryId: 3,
    });

    expect(result).toBe(42);

    const call = sb.rpcCalls.find((c) => c.fn === "record_transaction");
    expect(call).toBeDefined();
    expect(call?.params).toMatchObject({
      p_account_id: 5,
      p_type: VALID_TYPE,
      p_amount: 75.5,
      p_description: "Venta #101",
      p_reference_id: 101,
      p_reference_type: "sale",
      p_category_id: 3,
    });
  });

  it("optional fields default to null when not provided", async () => {
    const sb = makeMockSupabase({ rpc: { data: 7, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await recordTransaction({ accountId: 1, type: VALID_TYPE, amount: 10 });

    const call = sb.rpcCalls.find((c) => c.fn === "record_transaction");
    expect(call?.params).toMatchObject({
      p_description: null,
      p_reference_id: null,
      p_reference_type: null,
      p_category_id: null,
    });
  });

  it("RPC error propagates as thrown error", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: { message: "account not found" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      recordTransaction({ accountId: 99, type: VALID_TYPE, amount: 50 }),
    ).rejects.toBeTruthy();
  });
});

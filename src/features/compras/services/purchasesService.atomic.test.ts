/**
 * T1.2 — TDD: tests for create_purchase_atomic refactor (Phase 1, T1.6).
 * These tests FAIL until T1.6 (purchasesService refactor) is implemented.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPurchase } from "./purchasesService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getPurchaseNumber } from "@/utils/purchaseNumber";
import { makeMockSupabase } from "@/__tests__/mockSupabase";
import type { CreatePurchaseParams } from "../types";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/purchaseNumber", () => ({ getPurchaseNumber: vi.fn() }));

const mockedGetPurchaseNumber = vi.mocked(getPurchaseNumber);
const mockedLogAudit = vi.mocked(logAudit);

function makeCreateParams(overrides: Partial<CreatePurchaseParams> = {}): CreatePurchaseParams {
  return {
    items: [{ item_name: "Harina", ingredient_id: 1, price: 30 }],
    hasDelivery: false,
    deliveryCost: 0,
    total: 30,
    notes: "",
    selectedAccountId: 1,
    plinChangeAmount: 0,
    cajaAccountId: 1,
    bancoAccountId: 2,
    userId: "user-uuid",
    userName: "Seba",
    ...overrides,
  };
}

describe("createPurchase — atomic RPC path (T1.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPurchaseNumber.mockResolvedValue(7);
  });

  it("createPurchaseAtomic_happyPath: calls rpc('create_purchase_atomic') with a payload and NO direct from('purchases').insert", async () => {
    const sb = makeMockSupabase({
      // create_purchase_atomic returns the new purchase id
      rpc: { data: 88, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(makeCreateParams());

    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_purchase_atomic");
    expect(atomicCall).toBeDefined();

    // Must NOT have done a direct purchases insert
    const directInsert = sb.insertCalls.find((c) => c.table === "purchases");
    expect(directInsert).toBeUndefined();
  });

  it("createPurchaseAtomic_happyPath: logAudit called after successful RPC", async () => {
    const sb = makeMockSupabase({ rpc: { data: 88, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(makeCreateParams());

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear_transaccion", targetTable: "transactions" }),
    );
  });

  it("createPurchaseAtomic_errorPropagates: RPC error is thrown (no audit called)", async () => {
    const sb = makeMockSupabase({
      rpc: { data: null, error: { message: "price must be > 0" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createPurchase(makeCreateParams())).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("createPurchaseAtomic_payloadContainsItems: items array is present in RPC call", async () => {
    const sb = makeMockSupabase({ rpc: { data: 88, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(makeCreateParams());

    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_purchase_atomic");
    const payload = (atomicCall?.params as { p_payload: Record<string, unknown> })?.p_payload;
    expect(payload).toBeDefined();
    expect(payload?.items).toBeDefined();
    expect(Array.isArray(payload?.items)).toBe(true);
  });

  it("createPurchaseAtomic_paymentsTyped: payments array uses TransactionType-valid types (egreso_compra / ingreso_extra)", async () => {
    const sb = makeMockSupabase({ rpc: { data: 88, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(makeCreateParams({ plinChangeAmount: 5, total: 30 }));

    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_purchase_atomic");
    const payload = (atomicCall?.params as { p_payload: Record<string, unknown> })?.p_payload;
    const payments = payload?.payments as Array<{ type: string }> | undefined;
    expect(payments).toBeDefined();
    const types = (payments ?? []).map((p) => p.type);
    for (const t of types) {
      expect(["egreso_compra", "ingreso_extra"]).toContain(t);
    }
  });
});

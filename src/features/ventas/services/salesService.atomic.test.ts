/**
 * T1.2 — TDD: tests for create_sale_atomic refactor (Phase 1).
 * These tests FAIL until T1.4 (salesService refactor) is implemented.
 *
 * Tested behavior:
 * - createSale calls supabase.rpc("create_sale_atomic") instead of direct inserts
 * - RPC errors propagate
 * - Price validation / Rappi price path (payload shape)
 * - deleteSale permission check propagates (already passes; kept as regression)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSale, deleteSale } from "./salesService";
import { createClient } from "@/utils/supabase/client";
import { getSaleNumber } from "@/utils/saleNumber";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";
import type { SaleSubmitParams } from "../types";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/saleNumber", () => ({ getSaleNumber: vi.fn() }));

const mockedGetSaleNumber = vi.mocked(getSaleNumber);
const mockedLogAudit = vi.mocked(logAudit);

function makeSubmitParams(overrides: Partial<SaleSubmitParams> = {}): SaleSubmitParams {
  return {
    orderType: "Mesa",
    tableNumber: "5",
    customerDni: "",
    saleProducts: [
      {
        product_id: 1,
        product_name: "Latte",
        quantity: 1,
        unit_price: 12,
        subtotal: 12,
        temperatura: "caliente",
        tipo_leche: "entera",
        category_id: 10,
        loyalty_reward: null,
      },
    ],
    totalPrice: 12,
    discountAmount: 0,
    registerPayment: true,
    paymentMethod: "Efectivo",
    cashAmount: "",
    plinAmount: "",
    cashReceived: "12",
    notes: "",
    userId: "user-uuid",
    userName: "Seba",
    cajaAccountId: 1,
    bancoAccountId: 2,
    rappiAccountId: 3,
    posAccountId: 4,
    existingPaymentDate: null,
    ...overrides,
  };
}

describe("createSale — atomic RPC path (T1.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSaleNumber.mockResolvedValue(101);
  });

  it("createSaleAtomic_happyPath: calls rpc('create_sale_atomic') with a payload and NO direct from('sales').insert", async () => {
    const sb = makeMockSupabase({
      // create_sale_atomic returns the new sale id
      rpc: { data: 999, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(makeSubmitParams());

    // Must have called create_sale_atomic
    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_sale_atomic");
    expect(atomicCall).toBeDefined();

    // Must NOT have done a direct sales insert
    const directSalesInsert = sb.insertCalls.find((c) => c.table === "sales");
    expect(directSalesInsert).toBeUndefined();
  });

  it("createSaleAtomic_happyPath: logAudit called after successful RPC", async () => {
    const sb = makeMockSupabase({ rpc: { data: 999, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(makeSubmitParams());

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear_venta", targetTable: "sales" }),
    );
  });

  it("createSaleAtomic_errorPropagates: RPC error is thrown (no audit called)", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: { message: "price_mismatch" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createSale(makeSubmitParams())).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("createSaleAtomic_payloadContainsProducts: payload.products array is present in RPC call", async () => {
    const sb = makeMockSupabase({ rpc: { data: 999, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(makeSubmitParams());

    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_sale_atomic");
    const payload = (atomicCall?.params as { p_payload: Record<string, unknown> })?.p_payload;
    expect(payload).toBeDefined();
    expect(payload?.products).toBeDefined();
    expect(Array.isArray(payload?.products)).toBe(true);
  });

  it("createSaleAtomic_rappiPrice_accepts: Rappi order type sets order_type='Rappi' in header payload", async () => {
    const sb = makeMockSupabase({ rpc: { data: 999, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(
      makeSubmitParams({
        orderType: "Rappi",
        paymentMethod: "Rappi",
        totalPrice: 100,
        cashAmount: "",
        plinAmount: "",
        cashReceived: "",
      }),
    );

    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_sale_atomic");
    const payload = (atomicCall?.params as { p_payload: Record<string, unknown> })?.p_payload;
    const header = payload?.header as Record<string, unknown> | undefined;
    expect(header?.order_type).toBe("Rappi");
  });

  it("createSaleAtomic_discountField_accepts: discount_amount is in payload header", async () => {
    const sb = makeMockSupabase({ rpc: { data: 999, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(
      makeSubmitParams({
        totalPrice: 100,
        discountAmount: 20,
        paymentMethod: "Efectivo",
        cashReceived: "80",
      }),
    );

    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_sale_atomic");
    const payload = (atomicCall?.params as { p_payload: Record<string, unknown> })?.p_payload;
    const header = payload?.header as Record<string, unknown> | undefined;
    expect(Number(header?.discount_amount)).toBe(20);
  });

  it("createSaleAtomic_noPayment_registerPaymentFalse: register_payment=false in header payload", async () => {
    const sb = makeMockSupabase({ rpc: { data: 999, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(makeSubmitParams({ registerPayment: false }));

    const atomicCall = sb.rpcCalls.find((c) => c.fn === "create_sale_atomic");
    const payload = (atomicCall?.params as { p_payload: Record<string, unknown> })?.p_payload;
    const header = payload?.header as Record<string, unknown> | undefined;
    expect(header?.register_payment).toBe(false);
  });
});

describe("deleteSaleAtomic_permissionCheck (T1.2 regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSaleNumber.mockResolvedValue(42);
  });

  it("deleteSaleAtomic_permissionCheck: RPC error from has_permission failure propagates (no audit)", async () => {
    const sb = makeMockSupabase({
      single: { data: { total_price: 75.5 }, error: null },
    });
    sb.setRpcResult("delete_sale_atomic", {
      data: null,
      error: { message: "Solo administradores pueden eliminar ventas" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(deleteSale(7, "user-1", "Seba")).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

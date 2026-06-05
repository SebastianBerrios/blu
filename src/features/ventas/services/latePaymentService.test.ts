import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPaymentWithRewards } from "./latePaymentService";
import type { RegisterPaymentWithRewardsParams } from "./latePaymentService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/saleNumber", () => ({ getSaleNumber: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);
const mockedGetSaleNumber = vi.mocked(getSaleNumber);

function makeParams(
  overrides: Partial<RegisterPaymentWithRewardsParams> = {},
): RegisterPaymentWithRewardsParams {
  return {
    saleId: 99,
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
    newTotalPrice: 12,
    discountAmount: 0,
    paymentMethod: "Efectivo",
    cashAmount: "",
    plinAmount: "",
    cashReceived: "12",
    userId: "user-uuid",
    userName: "Seba",
    cajaAccountId: 1,
    bancoAccountId: 2,
    rappiAccountId: 3,
    ...overrides,
  };
}

function findRegisterCall(rpcCalls: Array<{ fn: string; params: unknown }>) {
  return rpcCalls.find((c) => c.fn === "register_late_payment");
}

function getRegisterParams(rpcCalls: Array<{ fn: string; params: unknown }>) {
  const call = findRegisterCall(rpcCalls);
  return call?.params as Record<string, unknown> | undefined;
}

describe("registerPaymentWithRewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSaleNumber.mockResolvedValue(77);
  });

  it("rechaza newTotalPrice <= 0 antes de tocar la DB", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      registerPaymentWithRewards(makeParams({ newTotalPrice: 0 })),
    ).rejects.toThrow("El total a cobrar debe ser mayor a 0");
    expect(sb.rpcCalls).toEqual([]);
  });

  it("happy path Efectivo: llama register_late_payment atómico con products + payments + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await registerPaymentWithRewards(makeParams());

    const params = getRegisterParams(sb.rpcCalls);
    expect(params).toBeDefined();
    expect(params?.p_sale_id).toBe(99);
    expect(params?.p_total_price).toBe(12);
    expect(params?.p_payment_method).toBe("Efectivo");
    expect(params?.p_cash_amount).toBe(12);
    expect(params?.p_plin_amount).toBeNull();
    expect(params?.p_cash_received).toBe(12);

    const products = params?.p_products as unknown[];
    expect(products).toHaveLength(1);
    expect(params?.p_payments).toEqual([
      expect.objectContaining({ account_id: 1, amount: 12, type: "ingreso_venta" }),
    ]);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear_transaccion" }),
    );
  });

  it("split Efectivo + Plin con sumas válidas: pasa cash y plin al RPC", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await registerPaymentWithRewards(
      makeParams({
        paymentMethod: "Efectivo + Plin",
        newTotalPrice: 100,
        cashAmount: "60",
        plinAmount: "40",
        cashReceived: "70",
      }),
    );

    const params = getRegisterParams(sb.rpcCalls);
    expect(params?.p_cash_amount).toBe(60);
    expect(params?.p_plin_amount).toBe(40);
    expect(params?.p_cash_received).toBe(70);
    expect(params?.p_payments).toEqual([
      expect.objectContaining({ account_id: 1, amount: 60 }),
      expect.objectContaining({ account_id: 2, amount: 40 }),
    ]);
  });

  it("split inválido (sumas no cuadran): throws antes de tocar la DB", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      registerPaymentWithRewards(
        makeParams({
          paymentMethod: "Efectivo + Plin",
          newTotalPrice: 100,
          cashAmount: "30",
          plinAmount: "30",
          cashReceived: "30",
        }),
      ),
    ).rejects.toThrow();

    expect(sb.rpcCalls).toEqual([]);
  });

  it("error del RPC: propaga", async () => {
    const sb = makeMockSupabase({
      rpc: { error: { message: "RLS denied" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(registerPaymentWithRewards(makeParams())).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("Rappi: calcula commission y registra net en cuenta Rappi", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await registerPaymentWithRewards(
      makeParams({
        paymentMethod: "Rappi",
        newTotalPrice: 100,
        cashAmount: "",
        plinAmount: "",
        cashReceived: "",
      }),
    );

    const params = getRegisterParams(sb.rpcCalls);
    expect(params?.p_payments).toEqual([
      expect.objectContaining({
        account_id: 3,
        type: "ingreso_venta",
        amount: 80, // 100 - 20% commission
        description: expect.stringContaining("Rappi (neto)"),
      }),
    ]);
  });

  it("Rappi sin rappiAccountId: throws", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      registerPaymentWithRewards(
        makeParams({
          paymentMethod: "Rappi",
          newTotalPrice: 100,
          cashAmount: "",
          plinAmount: "",
          cashReceived: "",
          rappiAccountId: null,
        }),
      ),
    ).rejects.toThrow("No se encontró la cuenta Rappi");
  });

  it("siempre llama register_late_payment exactamente una vez (atómico)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await registerPaymentWithRewards(makeParams({ paymentMethod: "Plin" }));

    const calls = sb.rpcCalls.filter((c) => c.fn === "register_late_payment");
    expect(calls).toHaveLength(1);
    // No debe hacer las operaciones legacy directas (UPDATE/DELETE/INSERT a sales/sale_products)
    expect(sb.updateCalls.find((c) => c.table === "sales")).toBeUndefined();
    expect(sb.deleteCalls.find((c) => c.table === "sale_products")).toBeUndefined();
    expect(sb.insertCalls.find((c) => c.table === "sale_products")).toBeUndefined();
  });

  it("con descuento: p_total_price bruto, p_discount_amount y pago al neto", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await registerPaymentWithRewards(
      makeParams({
        newTotalPrice: 100,
        discountAmount: 30,
        paymentMethod: "Efectivo",
        cashReceived: "70",
        saleProducts: [
          {
            product_id: 1,
            product_name: "Latte",
            quantity: 1,
            unit_price: 100,
            subtotal: 100,
            temperatura: null,
            tipo_leche: null,
            category_id: 10,
            loyalty_reward: null,
          },
        ],
      }),
    );

    const params = getRegisterParams(sb.rpcCalls);
    expect(params?.p_total_price).toBe(100); // bruto
    expect(params?.p_discount_amount).toBe(30);
    expect(params?.p_cash_amount).toBe(70); // neto
    expect(params?.p_payments).toEqual([
      expect.objectContaining({ account_id: 1, amount: 70 }),
    ]);
  });

  it("preserva loyalty_reward en p_products", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await registerPaymentWithRewards(
      makeParams({
        saleProducts: [
          {
            product_id: 1,
            product_name: "Postre",
            quantity: 1,
            unit_price: 10,
            subtotal: 10,
            temperatura: null,
            tipo_leche: null,
            category_id: 20,
            loyalty_reward: "50_postre",
          },
        ],
      }),
    );

    const params = getRegisterParams(sb.rpcCalls);
    const products = params?.p_products as Array<{ loyalty_reward: string }>;
    expect(products[0].loyalty_reward).toBe("50_postre");
  });
});

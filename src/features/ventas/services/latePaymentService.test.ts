import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPaymentWithRewards } from "./latePaymentService";
import type { RegisterPaymentWithRewardsParams } from "./latePaymentService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import { recordTransaction } from "@/hooks/useTransactions";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/saleNumber", () => ({ getSaleNumber: vi.fn() }));
vi.mock("@/hooks/useTransactions", () => ({ recordTransaction: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);
const mockedGetSaleNumber = vi.mocked(getSaleNumber);
const mockedRecordTransaction = vi.mocked(recordTransaction);

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
    paymentMethod: "Efectivo",
    cashAmount: "",
    plinAmount: "",
    cashReceived: "12",
    userId: "user-uuid",
    userName: "Seba",
    cajaAccountId: 1,
    bancoAccountId: 2,
    ...overrides,
  };
}

describe("registerPaymentWithRewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSaleNumber.mockResolvedValue(77);
  });

  it("happy path Efectivo: update sales, delete sale_products, insert, RPC, transacción + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await registerPaymentWithRewards(makeParams());

    // update sales
    const salesUpdate = sb.updateCalls.find((c) => c.table === "sales")!;
    const payload = salesUpdate.payload as Record<string, unknown>;
    expect(payload.payment_method).toBe("Efectivo");
    expect(payload.cash_amount).toBe(12);
    expect(payload.plin_amount).toBeNull();
    expect(payload.cash_received).toBe(12);

    // delete sale_products
    expect(sb.deleteCalls.find((c) => c.table === "sale_products")).toBeDefined();

    // insert sale_products
    const productsInsert = sb.insertCalls.find((c) => c.table === "sale_products")!;
    expect((productsInsert.payload as unknown[]).length).toBe(1);

    // RPC delete_sale_transactions
    expect(sb.rpcCalls).toEqual([
      { fn: "delete_sale_transactions", params: { p_sale_id: 99 } },
    ]);

    // recordTransaction (caja)
    expect(mockedRecordTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 1, amount: 12 }),
    );

    // audit final
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear_transaccion" }),
    );
  });

  it("split Efectivo + Plin con sumas válidas: parsea cash y plin correctos", async () => {
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

    const salesUpdate = sb.updateCalls.find((c) => c.table === "sales")!;
    const payload = salesUpdate.payload as Record<string, unknown>;
    expect(payload.cash_amount).toBe(60);
    expect(payload.plin_amount).toBe(40);
    expect(payload.cash_received).toBe(70);

    expect(mockedRecordTransaction).toHaveBeenCalledTimes(2);
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

    expect(sb.updateCalls).toHaveLength(0);
    expect(mockedRecordTransaction).not.toHaveBeenCalled();
  });

  it("error en update sales: propaga sin delete sale_products", async () => {
    const sb = makeMockSupabase({
      eqTerminal: { error: { message: "RLS denied" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(registerPaymentWithRewards(makeParams())).rejects.toBeTruthy();
    expect(sb.deleteCalls.find((c) => c.table === "sale_products")).toBeUndefined();
  });

  it("preserva loyalty_reward al re-insertar sale_products", async () => {
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

    const productsInsert = sb.insertCalls.find((c) => c.table === "sale_products")!;
    const rows = productsInsert.payload as Array<{ loyalty_reward: string | null }>;
    expect(rows[0].loyalty_reward).toBe("50_postre");
  });
});

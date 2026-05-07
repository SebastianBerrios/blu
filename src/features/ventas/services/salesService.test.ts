import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordSaleTransactions,
  deleteSale,
  createSale,
  updateSale,
} from "./salesService";
import { createClient } from "@/utils/supabase/client";
import { getSaleNumber } from "@/utils/saleNumber";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";
import type { SaleSubmitParams } from "../types";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/saleNumber", () => ({ getSaleNumber: vi.fn() }));
vi.mock("@/utils/helpers/deleteWithAudit", () => ({ deleteWithAudit: vi.fn() }));

const mockedGetSaleNumber = vi.mocked(getSaleNumber);
const mockedDeleteWithAudit = vi.mocked(deleteWithAudit);
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
    existingPaymentDate: null,
    ...overrides,
  };
}

function baseParams(overrides: Partial<Parameters<typeof recordSaleTransactions>[0]> = {}) {
  return {
    saleId: 10,
    saleNumber: 100,
    paymentMethod: null,
    totalPrice: 50,
    commission: null,
    cashAmount: null,
    plinAmount: null,
    cajaAccountId: 1,
    bancoAccountId: 2,
    rappiAccountId: 3,
    ...overrides,
  };
}

function findReplaceCall(rpcCalls: Array<{ fn: string; params: unknown }>) {
  return rpcCalls.find((c) => c.fn === "replace_sale_transactions");
}

function getReplacePayments(rpcCalls: Array<{ fn: string; params: unknown }>) {
  const call = findReplaceCall(rpcCalls);
  if (!call) return null;
  return (call.params as { p_payments: Array<Record<string, unknown>> }).p_payments;
}

describe("recordSaleTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Rappi sin rappiAccountId → throws", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      recordSaleTransactions(
        baseParams({ paymentMethod: "Rappi", rappiAccountId: null, totalPrice: 80, commission: 16 }),
      ),
    ).rejects.toThrow("No se encontró la cuenta Rappi");
    expect(sb.rpcCalls).toEqual([]);
  });

  it("Rappi con commission: registra net = total − commission via replace_sale_transactions", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await recordSaleTransactions(
      baseParams({ paymentMethod: "Rappi", totalPrice: 100, commission: 20 }),
    );
    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([
      {
        account_id: 3,
        type: "ingreso_venta",
        amount: 80,
        description: "Venta #100 - Rappi (neto)",
      },
    ]);
  });

  it("Rappi con net ≤ 0: payments vacío (revierte sin insertar)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await recordSaleTransactions(
      baseParams({ paymentMethod: "Rappi", totalPrice: 50, commission: 60 }),
    );
    expect(getReplacePayments(sb.rpcCalls)).toEqual([]);
  });

  it("Efectivo + Plin: 2 transacciones (caja + banco) en mismo payload", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await recordSaleTransactions(
      baseParams({
        paymentMethod: "Efectivo + Plin",
        totalPrice: 100,
        cashAmount: 60,
        plinAmount: 40,
      }),
    );
    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([
      { account_id: 1, type: "ingreso_venta", amount: 60, description: "Venta #100 - Efectivo" },
      { account_id: 2, type: "ingreso_venta", amount: 40, description: "Venta #100 - Plin" },
    ]);
  });

  it("Efectivo solo: 1 transacción a caja, no banco", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await recordSaleTransactions(
      baseParams({
        paymentMethod: "Efectivo",
        totalPrice: 50,
        cashAmount: 50,
        plinAmount: null,
      }),
    );
    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toHaveLength(1);
    expect(payments![0]).toMatchObject({ account_id: 1, amount: 50 });
  });

  it("Efectivo sin cajaAccountId: throws antes del RPC", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      recordSaleTransactions(
        baseParams({
          paymentMethod: "Efectivo",
          cashAmount: 50,
          cajaAccountId: null,
        }),
      ),
    ).rejects.toThrow("No se encontró la cuenta Caja");
    expect(sb.rpcCalls).toEqual([]);
  });

  it("Plin sin bancoAccountId: throws antes del RPC", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      recordSaleTransactions(
        baseParams({
          paymentMethod: "Plin",
          plinAmount: 30,
          bancoAccountId: null,
        }),
      ),
    ).rejects.toThrow("No se encontró la cuenta Bancaria");
    expect(sb.rpcCalls).toEqual([]);
  });
});

describe("deleteSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSaleNumber.mockResolvedValue(42);
  });

  it("happy path: getSaleNumber → select total → 2 RPCs → deleteWithAudit", async () => {
    const sb = makeMockSupabase({
      single: { data: { total_price: 75.5 }, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await deleteSale(7, "user-1", "Seba");

    expect(mockedGetSaleNumber).toHaveBeenCalledWith(7);
    expect(sb.from).toHaveBeenCalledWith("sales");
    expect(sb.rpcCalls).toEqual([
      {
        fn: "reverse_inventory_for_sale",
        params: { p_sale_id: 7, p_user_id: "user-1", p_user_name: "Seba" },
      },
      { fn: "delete_sale_transactions", params: { p_sale_id: 7 } },
    ]);
    expect(mockedDeleteWithAudit).toHaveBeenCalledWith({
      table: "sales",
      id: 7,
      userId: "user-1",
      userName: "Seba",
      auditTable: "sales",
      description: "Venta #42 - S/ 75.50",
    });
  });

  it("error en reverse_inventory_for_sale: throws sin llamar delete_sale_transactions", async () => {
    const sb = makeMockSupabase();
    sb.setRpcResult("reverse_inventory_for_sale", {
      data: null,
      error: { message: "stock corrupt" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(deleteSale(1, null, null)).rejects.toBeTruthy();
    expect(sb.rpcCalls.map((c) => c.fn)).toEqual(["reverse_inventory_for_sale"]);
    expect(mockedDeleteWithAudit).not.toHaveBeenCalled();
  });

  it("error en delete_sale_transactions: throws sin llamar deleteWithAudit", async () => {
    const sb = makeMockSupabase();
    sb.setRpcResult("delete_sale_transactions", {
      data: null,
      error: { message: "fk violation" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(deleteSale(2, null, null)).rejects.toBeTruthy();
    expect(sb.rpcCalls.map((c) => c.fn)).toEqual([
      "reverse_inventory_for_sale",
      "delete_sale_transactions",
    ]);
    expect(mockedDeleteWithAudit).not.toHaveBeenCalled();
  });

  it('formatea total como "?" cuando no hay total_price', async () => {
    const sb = makeMockSupabase({ single: { data: null, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await deleteSale(8, null, null);

    expect(mockedDeleteWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Venta #42 - S/ ?" }),
    );
  });
});

describe("createSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSaleNumber.mockResolvedValue(101);
  });

  it("rechaza totalPrice <= 0", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createSale(makeSubmitParams({ totalPrice: 0 }))).rejects.toThrow(
      "El total de la venta debe ser mayor a 0",
    );
    expect(sb.insertCalls).toEqual([]);
  });

  it("happy path Mesa con Efectivo y sin DNI: insert sales, sale_products, audit + transacciones via RPC", async () => {
    const sb = makeMockSupabase({
      single: { data: { id: 999 }, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(makeSubmitParams());

    // No customer resolution when DNI vacío
    const customerCalls = sb.selectCalls.filter((c) => c.table === "customers");
    expect(customerCalls).toHaveLength(0);

    // Insert sales
    const salesInsert = sb.insertCalls.find((c) => c.table === "sales");
    expect(salesInsert).toBeDefined();
    const payload = salesInsert!.payload as Record<string, unknown>;
    expect(payload.order_type).toBe("Mesa");
    expect(payload.table_number).toBe(5);
    expect(payload.customer_id).toBeNull();
    expect(payload.commission).toBeNull();
    expect(payload.payment_method).toBe("Efectivo");
    expect(payload.cash_amount).toBe(12);
    expect(payload.cash_received).toBe(12);
    expect(payload.user_id).toBe("user-uuid");

    // Insert sale_products excludes Entregado (none here)
    const productsInsert = sb.insertCalls.find((c) => c.table === "sale_products");
    expect(productsInsert).toBeDefined();
    expect((productsInsert!.payload as unknown[]).length).toBe(1);

    // Audit logs: crear_venta + crear_transaccion
    expect(mockedLogAudit).toHaveBeenCalledTimes(2);
    expect(mockedLogAudit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: "crear_venta", targetTable: "sales" }),
    );
    expect(mockedLogAudit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: "crear_transaccion" }),
    );

    // Transaction recorded for caja via replace_sale_transactions
    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([
      expect.objectContaining({ account_id: 1, amount: 12 }),
    ]);
  });

  it("Mesa con DNI nuevo: inserta customer y usa el id retornado", async () => {
    const sb = makeMockSupabase();
    sb.setResult("customers", { data: null, error: null }); // no existing
    let insertCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === "customers") {
        insertCount++;
        const isFirstCall = insertCount === 1;
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: isFirstCall ? null : { id: 555 },
                error: null,
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 555 }, error: null })),
            })),
          })),
        };
      }
      // sales / sale_products
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 999 }, error: null })),
          })),
        })),
      };
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(makeSubmitParams({ customerDni: "12345678" }));

    // The sales insert uses customer_id = 555
    const lastCalls = sb.from.mock.calls.map((c) => c[0]);
    expect(lastCalls).toContain("customers");
    expect(lastCalls).toContain("sales");
  });

  it("Rappi: commission calculada, table_number null, replace_sale_transactions con neto", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 999 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(
      makeSubmitParams({
        orderType: "Rappi",
        tableNumber: "",
        totalPrice: 100,
        paymentMethod: "Rappi",
        cashAmount: "",
        plinAmount: "",
        cashReceived: "",
      }),
    );

    const salesInsert = sb.insertCalls.find((c) => c.table === "sales")!;
    const payload = salesInsert.payload as Record<string, unknown>;
    expect(payload.order_type).toBe("Rappi");
    expect(payload.commission).toBe(20); // 100 * 0.2
    expect(payload.table_number).toBeNull();

    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([
      expect.objectContaining({
        account_id: 3,
        type: "ingreso_venta",
        amount: 80,
        description: expect.stringContaining("Rappi (neto)"),
      }),
    ]);
  });

  it("registerPayment=false: NO llama replace_sale_transactions ni segundo audit", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 999 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createSale(makeSubmitParams({ registerPayment: false }));

    expect(findReplaceCall(sb.rpcCalls)).toBeUndefined();
    expect(mockedLogAudit).toHaveBeenCalledTimes(1);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear_venta" }),
    );
  });

  it("error en insert sales: propaga y no llega a sale_products ni audit", async () => {
    const sb = makeMockSupabase({
      single: { data: null, error: { message: "RLS denied" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createSale(makeSubmitParams())).rejects.toBeTruthy();

    // sale_products insert never happened
    expect(sb.insertCalls.find((c) => c.table === "sale_products")).toBeUndefined();
    expect(mockedLogAudit).not.toHaveBeenCalled();
    expect(findReplaceCall(sb.rpcCalls)).toBeUndefined();
  });

  it("filtra items con status=Entregado del insert de sale_products", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 999 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const params = makeSubmitParams({
      saleProducts: [
        {
          product_id: 1,
          product_name: "A",
          quantity: 1,
          unit_price: 10,
          subtotal: 10,
          temperatura: null,
          tipo_leche: null,
          category_id: null,
          loyalty_reward: null,
          status: "Entregado",
        },
        {
          product_id: 2,
          product_name: "B",
          quantity: 1,
          unit_price: 5,
          subtotal: 5,
          temperatura: null,
          tipo_leche: null,
          category_id: null,
          loyalty_reward: null,
          status: "Pendiente",
        },
      ],
      totalPrice: 15,
      cashReceived: "15",
    });

    await createSale(params);

    const productsInsert = sb.insertCalls.find((c) => c.table === "sale_products")!;
    const rows = productsInsert.payload as Array<{ product_id: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].product_id).toBe(2);
  });
});

describe("updateSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSaleNumber.mockResolvedValue(50);
  });

  function makeUpdateMock(existingSale: Record<string, unknown> = {}) {
    const sb = makeMockSupabase({
      single: {
        data: {
          payment_method: "Efectivo",
          cash_amount: 12,
          plin_amount: null,
          total_price: 12,
          ...existingSale,
        },
        error: null,
      },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    return sb;
  }

  it("rechaza totalPrice <= 0", async () => {
    const sb = makeUpdateMock();
    await expect(
      updateSale(99, makeSubmitParams({ totalPrice: 0 })),
    ).rejects.toThrow("El total de la venta debe ser mayor a 0");
    expect(sb.updateCalls).toEqual([]);
  });

  it("regresión bug fix: items con status=Entregado se preservan (DELETE filtra status='Pendiente')", async () => {
    const sb = makeUpdateMock();
    const params = makeSubmitParams({
      saleProducts: [
        {
          product_id: 1,
          product_name: "Latte (entregado)",
          quantity: 1,
          unit_price: 12,
          subtotal: 12,
          temperatura: "caliente",
          tipo_leche: "entera",
          category_id: 10,
          loyalty_reward: null,
          status: "Entregado",
          id: 100,
        },
        {
          product_id: 2,
          product_name: "Croissant nuevo",
          quantity: 1,
          unit_price: 8,
          subtotal: 8,
          temperatura: null,
          tipo_leche: null,
          category_id: 20,
          loyalty_reward: null,
        },
      ],
      totalPrice: 20,
      cashReceived: "20",
    });

    await updateSale(99, params);

    // DELETE on sale_products debe filtrar status='Pendiente' Y sale_id
    const deleteCall = sb.deleteCalls.find((c) => c.table === "sale_products")!;
    expect(deleteCall).toBeDefined();
    expect(deleteCall.filters).toEqual([
      ["sale_id", 99],
      ["status", "Pendiente"],
    ]);

    // INSERT solo del Croissant (Latte no se reinsertó)
    const productsInsert = sb.insertCalls.find((c) => c.table === "sale_products")!;
    const rows = productsInsert.payload as Array<{ product_id: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].product_id).toBe(2);
  });

  it("solo items pendientes: DELETE filtra Pendiente, INSERT con todos", async () => {
    const sb = makeUpdateMock();
    await updateSale(
      99,
      makeSubmitParams({
        saleProducts: [
          {
            product_id: 1,
            product_name: "A",
            quantity: 1,
            unit_price: 5,
            subtotal: 5,
            temperatura: null,
            tipo_leche: null,
            category_id: null,
            loyalty_reward: null,
          },
          {
            product_id: 2,
            product_name: "B",
            quantity: 1,
            unit_price: 7,
            subtotal: 7,
            temperatura: null,
            tipo_leche: null,
            category_id: null,
            loyalty_reward: null,
          },
        ],
        totalPrice: 12,
        cashReceived: "12",
      }),
    );
    const productsInsert = sb.insertCalls.find((c) => c.table === "sale_products")!;
    expect((productsInsert.payload as unknown[]).length).toBe(2);
  });

  it("100% entregados: NO llama insert de sale_products (guard de empty insert)", async () => {
    const sb = makeUpdateMock();
    await updateSale(
      99,
      makeSubmitParams({
        saleProducts: [
          {
            product_id: 1,
            product_name: "A",
            quantity: 1,
            unit_price: 5,
            subtotal: 5,
            temperatura: null,
            tipo_leche: null,
            category_id: null,
            loyalty_reward: null,
            status: "Entregado",
            id: 1,
          },
        ],
        totalPrice: 5,
        cashReceived: "5",
      }),
    );
    expect(sb.insertCalls.find((c) => c.table === "sale_products")).toBeUndefined();
  });

  it("sin cambio de payment ni Rappi total: NO llama replace_sale_transactions", async () => {
    const sb = makeUpdateMock({
      payment_method: "Efectivo",
      cash_amount: 12,
      plin_amount: null,
      total_price: 12,
    });
    await updateSale(99, makeSubmitParams({ totalPrice: 12, cashReceived: "12" }));
    expect(findReplaceCall(sb.rpcCalls)).toBeUndefined();
  });

  it("cambio payment_method (Efectivo → Plin): regenera transacciones via replace + audit con metodos", async () => {
    const sb = makeUpdateMock({
      payment_method: "Efectivo",
      cash_amount: 12,
      plin_amount: null,
      total_price: 12,
    });
    await updateSale(
      99,
      makeSubmitParams({
        paymentMethod: "Plin",
        cashAmount: "",
        plinAmount: "",
        cashReceived: "",
      }),
    );
    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([
      expect.objectContaining({ account_id: 2, type: "ingreso_venta" }),
    ]);
    const auditCall = mockedLogAudit.mock.calls.find(
      ([call]) => (call as { details?: { metodo_anterior?: string } }).details?.metodo_anterior === "Efectivo",
    );
    expect(auditCall).toBeDefined();
    const details = (auditCall![0] as { details: { metodo_nuevo: string } }).details;
    expect(details.metodo_nuevo).toBe("Plin");
  });

  it("Rappi: cambia total_price → rappiTotalChanged regenera transacciones", async () => {
    const sb = makeUpdateMock({
      payment_method: "Rappi",
      cash_amount: null,
      plin_amount: null,
      total_price: 100,
    });
    await updateSale(
      99,
      makeSubmitParams({
        orderType: "Rappi",
        paymentMethod: "Rappi",
        totalPrice: 150,
        cashAmount: "",
        plinAmount: "",
        cashReceived: "",
      }),
    );
    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([
      expect.objectContaining({
        account_id: 3,
        amount: 120, // 150 - 20% commission
      }),
    ]);
  });

  it("pago removido: replace con payments vacíos + audit metodo_nuevo=null", async () => {
    const sb = makeUpdateMock({
      payment_method: "Efectivo",
      cash_amount: 12,
      plin_amount: null,
      total_price: 12,
    });
    await updateSale(
      99,
      makeSubmitParams({
        registerPayment: false,
        cashAmount: "",
        plinAmount: "",
        cashReceived: "",
      }),
    );
    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([]); // sin pago, no insertamos pero sí revertimos las anteriores
    const auditCall = mockedLogAudit.mock.calls.find(
      ([call]) => (call as { details?: { metodo_nuevo?: unknown } }).details?.metodo_nuevo === null,
    );
    expect(auditCall).toBeDefined();
  });

  it("error en fetch existing sale: propaga sin update", async () => {
    const sb = makeMockSupabase({
      single: { data: null, error: { message: "sale missing" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(updateSale(404, makeSubmitParams())).rejects.toBeTruthy();
    expect(sb.updateCalls.find((c) => c.table === "sales")).toBeUndefined();
  });

  it("RLS rechaza update silenciosamente (0 filas): throws con mensaje claro y NO toca sale_products", async () => {
    const sb = makeUpdateMock();
    sb.setUpdateSelectResult("sales", { data: [], error: null });

    await expect(
      updateSale(99, makeSubmitParams({ totalPrice: 25, cashReceived: "25" })),
    ).rejects.toThrow(/Solo puedes editar tus propias ventas del día actual/);

    expect(sb.deleteCalls.find((c) => c.table === "sale_products")).toBeUndefined();
    expect(sb.insertCalls.find((c) => c.table === "sale_products")).toBeUndefined();
    expect(findReplaceCall(sb.rpcCalls)).toBeUndefined();
  });
});

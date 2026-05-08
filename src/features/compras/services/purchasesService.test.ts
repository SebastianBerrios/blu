import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validatePurchaseForm,
  deletePurchase,
  createPurchase,
  updatePurchase,
} from "./purchasesService";
import type { PurchaseItemLine } from "@/types";
import type { CreatePurchaseParams, UpdatePurchaseParams } from "../types";
import { createClient } from "@/utils/supabase/client";
import { getPurchaseNumber } from "@/utils/purchaseNumber";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/purchaseNumber", () => ({ getPurchaseNumber: vi.fn() }));

const mockedGetPurchaseNumber = vi.mocked(getPurchaseNumber);
const mockedLogAudit = vi.mocked(logAudit);

function makeCreateParams(
  overrides: Partial<CreatePurchaseParams> = {},
): CreatePurchaseParams {
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

function makeUpdateParams(
  overrides: Partial<UpdatePurchaseParams> = {},
): UpdatePurchaseParams {
  return {
    purchaseId: 50,
    items: [{ item_name: "Azúcar", ingredient_id: 2, price: 15 }],
    hasDelivery: false,
    deliveryCost: 0,
    total: 15,
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

function makeItems(n = 1): PurchaseItemLine[] {
  return Array.from({ length: n }, (_, i) => ({
    item_name: `Item ${i + 1}`,
    ingredient_id: i + 1,
    price: 10,
  }));
}

function defaults() {
  return {
    items: makeItems(1),
    hasDelivery: false,
    deliveryCost: "",
    selectedAccountId: 1 as number | null,
    hasPlinChange: false,
    plinChange: "",
    total: 10,
    hasBancoAccount: true,
    isEditMode: false,
  };
}

function findReplaceCall(rpcCalls: Array<{ fn: string; params: unknown }>) {
  return rpcCalls.find((c) => c.fn === "replace_purchase_transactions");
}

function getReplacePayments(rpcCalls: Array<{ fn: string; params: unknown }>) {
  const call = findReplaceCall(rpcCalls);
  if (!call) return null;
  return (call.params as { p_payments: Array<Record<string, unknown>> }).p_payments;
}

describe("validatePurchaseForm", () => {
  it("retorna error cuando items está vacío", () => {
    expect(validatePurchaseForm({ ...defaults(), items: [] })).toBe(
      "Agrega al menos un ítem",
    );
  });

  it("retorna error cuando total <= 0", () => {
    expect(validatePurchaseForm({ ...defaults(), total: 0 })).toBe(
      "El total de la compra debe ser mayor a 0",
    );
    expect(validatePurchaseForm({ ...defaults(), total: -10 })).toBe(
      "El total de la compra debe ser mayor a 0",
    );
  });

  it("retorna error cuando hasDelivery con deliveryCost NaN", () => {
    expect(
      validatePurchaseForm({ ...defaults(), hasDelivery: true, deliveryCost: "abc" }),
    ).toBe("Ingresa un costo de delivery válido");
  });

  it("retorna error cuando hasDelivery con deliveryCost = 0", () => {
    expect(
      validatePurchaseForm({ ...defaults(), hasDelivery: true, deliveryCost: "0" }),
    ).toBe("Ingresa un costo de delivery válido");
  });

  it("retorna error cuando no hay selectedAccountId", () => {
    expect(
      validatePurchaseForm({ ...defaults(), selectedAccountId: null }),
    ).toBe("Selecciona una cuenta para la compra");
  });

  it("retorna error cuando hasPlinChange con monto ≤ 0 (también en editMode)", () => {
    expect(
      validatePurchaseForm({
        ...defaults(),
        hasPlinChange: true,
        plinChange: "0",
        isEditMode: false,
      }),
    ).toBe("Ingresa un monto válido para el vuelto por Plin");
    expect(
      validatePurchaseForm({
        ...defaults(),
        hasPlinChange: true,
        plinChange: "0",
        isEditMode: true,
      }),
    ).toBe("Ingresa un monto válido para el vuelto por Plin");
  });

  it("retorna error cuando hasPlinChange sin cuenta bancaria", () => {
    expect(
      validatePurchaseForm({
        ...defaults(),
        hasPlinChange: true,
        plinChange: "5",
        hasBancoAccount: false,
        isEditMode: false,
      }),
    ).toBe("No hay cuenta bancaria configurada para recibir el vuelto");
  });

  it("retorna null cuando todo es válido", () => {
    expect(validatePurchaseForm(defaults())).toBeNull();
  });

  it("retorna null con hasPlinChange válido + banco configurado (también en editMode)", () => {
    expect(
      validatePurchaseForm({
        ...defaults(),
        hasPlinChange: true,
        plinChange: "5",
        hasBancoAccount: true,
        isEditMode: true,
      }),
    ).toBeNull();
  });
});

describe("deletePurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPurchaseNumber.mockResolvedValue(13);
  });

  it("happy path: llama delete_purchase_atomic + audit", async () => {
    const sb = makeMockSupabase({ single: { data: { total: 250.0 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await deletePurchase(5, "user-1", "Seba");

    expect(mockedGetPurchaseNumber).toHaveBeenCalledWith(5);
    expect(sb.rpcCalls).toEqual([
      { fn: "delete_purchase_atomic", params: { p_purchase_id: 5 } },
    ]);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "eliminar",
        targetTable: "purchases",
        targetId: 5,
        targetDescription: "Compra #13 - S/ 250.00",
      }),
    );
  });

  it("error en delete_purchase_atomic: propaga sin loguear audit", async () => {
    const sb = makeMockSupabase();
    sb.setRpcResult("delete_purchase_atomic", {
      data: null,
      error: { message: "RLS denied" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(deletePurchase(7, null, null)).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

describe("createPurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPurchaseNumber.mockResolvedValue(7);
  });

  it("no autenticado: throws sin tocar la DB", async () => {
    const sb = makeMockSupabase({ authUser: { user: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createPurchase(makeCreateParams())).rejects.toThrow("No autenticado");
    expect(sb.insertCalls).toHaveLength(0);
  });

  it("happy path sin Plin change: 1 transacción via replace_purchase_transactions + audit", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 88 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(makeCreateParams());

    const purchaseInsert = sb.insertCalls.find((c) => c.table === "purchases")!;
    const payload = purchaseInsert.payload as Record<string, unknown>;
    expect(payload.user_id).toBe("test-user-uuid");
    expect(payload.total).toBe(30);
    expect(payload.account_id).toBe(1);
    expect(payload.plin_change).toBeNull();
    expect(payload.delivery_cost).toBeNull();

    const itemsInsert = sb.insertCalls.find((c) => c.table === "purchase_items")!;
    expect(itemsInsert).toBeDefined();

    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toEqual([
      expect.objectContaining({
        account_id: 1,
        type: "egreso_compra",
        amount: -30,
      }),
    ]);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crear_transaccion",
        targetTable: "transactions",
      }),
    );
  });

  it("con Plin change > 0: 2 entradas en payload (caja egreso total+plin, banco ingreso_extra)", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 88 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(
      makeCreateParams({ plinChangeAmount: 10, total: 50 }),
    );

    const payments = getReplacePayments(sb.rpcCalls);
    expect(payments).toHaveLength(2);
    expect(payments![0]).toEqual(
      expect.objectContaining({
        account_id: 1,
        type: "egreso_compra",
        amount: -60, // total + plin
        description: expect.stringContaining("vuelto Plin S/ 10.00"),
      }),
    );
    expect(payments![1]).toEqual(
      expect.objectContaining({
        account_id: 2,
        type: "ingreso_extra",
        amount: 10,
        description: expect.stringContaining("Vuelto Plin"),
      }),
    );
    const auditDetails = (mockedLogAudit.mock.calls[0]?.[0] as { details: { vuelto_plin: number } })?.details;
    expect(auditDetails.vuelto_plin).toBe(10);
  });

  it("hasDelivery=true: incluye delivery_cost en el insert", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 88 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(
      makeCreateParams({ hasDelivery: true, deliveryCost: 7.5 }),
    );

    const purchaseInsert = sb.insertCalls.find((c) => c.table === "purchases")!;
    const payload = purchaseInsert.payload as Record<string, unknown>;
    expect(payload.has_delivery).toBe(true);
    expect(payload.delivery_cost).toBe(7.5);
  });

  it("error en insert items: propaga sin llamar replace_purchase_transactions", async () => {
    const sb = makeMockSupabase();
    let insertCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === "purchases") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 88 }, error: null })),
            })),
          })),
        };
      }
      // purchase_items
      insertCount++;
      return {
        insert: vi.fn(async () => ({ error: { message: "items broken" } })),
      };
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(createPurchase(makeCreateParams())).rejects.toBeTruthy();
    expect(insertCount).toBe(1);
    expect(sb.rpcCalls).toEqual([]);
  });
});

describe("updatePurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPurchaseNumber.mockResolvedValue(8);
  });

  function getAtomicParams(rpcCalls: Array<{ fn: string; params: unknown }>) {
    const call = rpcCalls.find((c) => c.fn === "update_purchase_atomic");
    return call?.params as Record<string, unknown> | undefined;
  }

  it("happy path sin Plin change: llama update_purchase_atomic con 1 payment + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updatePurchase(makeUpdateParams({ total: 25 }));

    const params = getAtomicParams(sb.rpcCalls);
    expect(params).toBeDefined();
    expect(params?.p_total).toBe(25);
    expect(params?.p_plin_change).toBe(0);
    expect(params?.p_payments).toEqual([
      expect.objectContaining({
        account_id: 1,
        type: "egreso_compra",
        amount: -25,
      }),
    ]);
    // No debe hacer las operaciones legacy directas
    expect(sb.updateCalls.find((c) => c.table === "purchases")).toBeUndefined();
    expect(sb.deleteCalls.find((c) => c.table === "purchase_items")).toBeUndefined();
    expect(sb.insertCalls.find((c) => c.table === "purchase_items")).toBeUndefined();
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "actualizar", targetTable: "purchases" }),
    );
  });

  it("con plinChangeAmount nuevo: 2 payments (caja+banco) en RPC", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updatePurchase(makeUpdateParams({ total: 50, plinChangeAmount: 12 }));

    const params = getAtomicParams(sb.rpcCalls);
    expect(params?.p_plin_change).toBe(12);
    const payments = params?.p_payments as Array<Record<string, unknown>>;
    expect(payments).toHaveLength(2);
    expect(payments[0]).toEqual(
      expect.objectContaining({
        account_id: 1,
        type: "egreso_compra",
        amount: -62, // 50 + 12
      }),
    );
    expect(payments[1]).toEqual(
      expect.objectContaining({
        account_id: 2,
        type: "ingreso_extra",
        amount: 12,
      }),
    );
  });

  it("plinChangeAmount > 0 sin cajaAccountId: throws antes de tocar la DB", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      updatePurchase(
        makeUpdateParams({ plinChangeAmount: 10, cajaAccountId: null }),
      ),
    ).rejects.toThrow("No se encontró la cuenta Caja");
    expect(sb.rpcCalls).toEqual([]);
  });

  it("error en RPC update_purchase_atomic: propaga", async () => {
    const sb = makeMockSupabase();
    sb.setRpcResult("update_purchase_atomic", {
      data: null,
      error: { message: "denied" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(updatePurchase(makeUpdateParams())).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("hasDelivery=true: pasa delivery_cost al RPC", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updatePurchase(
      makeUpdateParams({ hasDelivery: true, deliveryCost: 7.5 }),
    );

    const params = getAtomicParams(sb.rpcCalls);
    expect(params?.p_has_delivery).toBe(true);
    expect(params?.p_delivery_cost).toBe(7.5);
  });
});

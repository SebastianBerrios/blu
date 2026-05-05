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
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { logAudit } from "@/utils/auditLog";
import { recordTransaction } from "@/hooks/useTransactions";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/purchaseNumber", () => ({ getPurchaseNumber: vi.fn() }));
vi.mock("@/utils/helpers/deleteWithAudit", () => ({ deleteWithAudit: vi.fn() }));
vi.mock("@/hooks/useTransactions", () => ({ recordTransaction: vi.fn() }));

const mockedGetPurchaseNumber = vi.mocked(getPurchaseNumber);
const mockedDeleteWithAudit = vi.mocked(deleteWithAudit);
const mockedLogAudit = vi.mocked(logAudit);
const mockedRecordTransaction = vi.mocked(recordTransaction);

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

describe("validatePurchaseForm", () => {
  it("retorna error cuando items está vacío", () => {
    expect(validatePurchaseForm({ ...defaults(), items: [] })).toBe(
      "Agrega al menos un ítem",
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

  it("retorna error cuando hasPlinChange en createMode con monto ≤ 0", () => {
    expect(
      validatePurchaseForm({
        ...defaults(),
        hasPlinChange: true,
        plinChange: "0",
        isEditMode: false,
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

  it("permite hasPlinChange en editMode aunque monto sea 0 (no se valida)", () => {
    expect(
      validatePurchaseForm({
        ...defaults(),
        hasPlinChange: true,
        plinChange: "0",
        isEditMode: true,
      }),
    ).toBeNull();
  });

  it("retorna null cuando todo es válido", () => {
    expect(validatePurchaseForm(defaults())).toBeNull();
  });

  it("retorna null con hasPlinChange válido + banco configurado", () => {
    expect(
      validatePurchaseForm({
        ...defaults(),
        hasPlinChange: true,
        plinChange: "5",
        hasBancoAccount: true,
        isEditMode: false,
      }),
    ).toBeNull();
  });
});

describe("deletePurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPurchaseNumber.mockResolvedValue(13);
  });

  it("happy path: getPurchaseNumber → select total → RPC → deleteWithAudit", async () => {
    const sb = makeMockSupabase({ single: { data: { total: 250.0 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await deletePurchase(5, "user-1", "Seba");

    expect(mockedGetPurchaseNumber).toHaveBeenCalledWith(5);
    expect(sb.rpcCalls).toEqual([
      { fn: "delete_purchase_transactions", params: { p_purchase_id: 5 } },
    ]);
    expect(mockedDeleteWithAudit).toHaveBeenCalledWith({
      table: "purchases",
      id: 5,
      userId: "user-1",
      userName: "Seba",
      auditTable: "purchases",
      description: "Compra #13 - S/ 250.00",
    });
  });

  it("error en delete_purchase_transactions: throws sin llamar deleteWithAudit", async () => {
    const sb = makeMockSupabase();
    sb.setRpcResult("delete_purchase_transactions", {
      data: null,
      error: { message: "fk error" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(deletePurchase(7, null, null)).rejects.toBeTruthy();
    expect(mockedDeleteWithAudit).not.toHaveBeenCalled();
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

  it("happy path sin Plin change: 1 transacción + audit", async () => {
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

    expect(mockedRecordTransaction).toHaveBeenCalledTimes(1);
    expect(mockedRecordTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 1,
        type: "egreso_compra",
        amount: -30,
      }),
    );
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crear_transaccion",
        targetTable: "transactions",
      }),
    );
  });

  it("con Plin change > 0: 2 transacciones (caja egreso total+plin, banco ingreso_extra)", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 88 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createPurchase(
      makeCreateParams({ plinChangeAmount: 10, total: 50 }),
    );

    expect(mockedRecordTransaction).toHaveBeenCalledTimes(2);
    expect(mockedRecordTransaction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        accountId: 1,
        type: "egreso_compra",
        amount: -60, // total + plin
        description: expect.stringContaining("vuelto Plin S/ 10.00"),
      }),
    );
    expect(mockedRecordTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        accountId: 2,
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

  it("error en insert items: propaga", async () => {
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
    expect(mockedRecordTransaction).not.toHaveBeenCalled();
  });
});

describe("updatePurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPurchaseNumber.mockResolvedValue(8);
  });

  it("happy path sin Plin change pre-existente: 1 transacción + audit", async () => {
    const sb = makeMockSupabase({
      single: { data: { plin_change: null }, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updatePurchase(makeUpdateParams({ total: 25 }));

    expect(sb.rpcCalls).toEqual([
      { fn: "delete_purchase_transactions", params: { p_purchase_id: 50 } },
    ]);
    expect(sb.updateCalls.find((c) => c.table === "purchases")).toBeDefined();
    expect(sb.deleteCalls.find((c) => c.table === "purchase_items")).toBeDefined();
    expect(sb.insertCalls.find((c) => c.table === "purchase_items")).toBeDefined();

    expect(mockedRecordTransaction).toHaveBeenCalledTimes(1);
    expect(mockedRecordTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 1,
        type: "egreso_compra",
        amount: -25,
      }),
    );
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "actualizar", targetTable: "purchases" }),
    );
  });

  it("con plin_change preexistente: 2 transacciones (caja+banco)", async () => {
    const sb = makeMockSupabase({
      single: { data: { plin_change: 12 }, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updatePurchase(makeUpdateParams({ total: 50 }));

    expect(mockedRecordTransaction).toHaveBeenCalledTimes(2);
    expect(mockedRecordTransaction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        accountId: 1,
        type: "egreso_compra",
        amount: -62, // 50 + 12
      }),
    );
    expect(mockedRecordTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        accountId: 2,
        type: "ingreso_extra",
        amount: 12,
      }),
    );
  });

  it("error en RPC delete_purchase_transactions: propaga sin update", async () => {
    const sb = makeMockSupabase({
      single: { data: { plin_change: null }, error: null },
    });
    sb.setRpcResult("delete_purchase_transactions", {
      data: null,
      error: { message: "denied" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(updatePurchase(makeUpdateParams())).rejects.toBeTruthy();
    expect(sb.updateCalls.find((c) => c.table === "purchases")).toBeUndefined();
  });

  it("error en select existing: propaga sin RPC", async () => {
    const sb = makeMockSupabase({
      single: { data: null, error: { message: "missing" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(updatePurchase(makeUpdateParams())).rejects.toBeTruthy();
    expect(sb.rpcCalls).toHaveLength(0);
  });
});

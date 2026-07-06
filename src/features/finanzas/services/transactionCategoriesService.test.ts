/**
 * T3.5 — Tests for transactionCategoriesService CRUD.
 * Covers: createTransactionCategory, updateTransactionCategory,
 * setTransactionCategoryActive — upsert/update shapes, error propagation,
 * logAudit firing, and name-validation guards.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTransactionCategory,
  updateTransactionCategory,
  setTransactionCategoryActive,
} from "./transactionCategoriesService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

const ACTOR = { userId: "admin-1", userName: "Admin" };

// ---------------------------------------------------------------------------
// createTransactionCategory
// ---------------------------------------------------------------------------

describe("createTransactionCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts into transaction_categories with trimmed name and kind", async () => {
    const sb = makeMockSupabase({
      single: { data: { id: 10, name: "Insumos", kind: "egreso", is_active: true }, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createTransactionCategory({ name: "  Insumos  ", kind: "egreso" }, ACTOR);

    const insertCall = sb.insertCalls.find((c) => c.table === "transaction_categories");
    expect(insertCall).toBeDefined();
    const payload = insertCall?.payload as Record<string, unknown>;
    expect(payload?.name).toBe("Insumos"); // trimmed
    expect(payload?.kind).toBe("egreso");
  });

  it("returns the created category data", async () => {
    const created = { id: 11, name: "Ventas Online", kind: "ingreso", is_active: true };
    const sb = makeMockSupabase({ single: { data: created, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await createTransactionCategory(
      { name: "Ventas Online", kind: "ingreso" },
      ACTOR,
    );

    expect(result).toEqual(created);
  });

  it("logAudit called with crear action after success", async () => {
    const sb = makeMockSupabase({
      single: { data: { id: 12, name: "Rappi", kind: "ingreso", is_active: true }, error: null },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createTransactionCategory({ name: "Rappi", kind: "ingreso" }, ACTOR);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crear",
        targetTable: "transaction_categories",
      }),
    );
  });

  it("throws when name is empty (validation guard, no DB call)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      createTransactionCategory({ name: "   ", kind: "egreso" }, ACTOR),
    ).rejects.toThrow("Ingresa un nombre de categoría");

    // No insert should have been attempted
    expect(sb.insertCalls).toHaveLength(0);
  });

  it("DB error propagates (no logAudit called)", async () => {
    const sb = makeMockSupabase({
      single: { data: null, error: { message: "unique_violation" } },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      createTransactionCategory({ name: "Duplicate", kind: "ingreso" }, ACTOR),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateTransactionCategory
// ---------------------------------------------------------------------------

describe("updateTransactionCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates transaction_categories with trimmed name", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateTransactionCategory(5, { name: "  Nuevo Nombre  " }, ACTOR);

    const updateCall = sb.updateCalls.find((c) => c.table === "transaction_categories");
    expect(updateCall).toBeDefined();
    const payload = updateCall?.payload as Record<string, unknown>;
    expect(payload?.name).toBe("Nuevo Nombre"); // trimmed
  });

  it("applies filter by id", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateTransactionCategory(7, { name: "Otro Nombre" }, ACTOR);

    const updateCall = sb.updateCalls.find((c) => c.table === "transaction_categories");
    const filters = updateCall?.filters ?? [];
    expect(filters.some(([col, val]) => col === "id" && val === 7)).toBe(true);
  });

  it("logAudit called with actualizar action after success", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateTransactionCategory(5, { name: "Comisión" }, ACTOR);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "actualizar",
        targetTable: "transaction_categories",
        targetId: 5,
      }),
    );
  });

  it("throws when name is empty (validation guard)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      updateTransactionCategory(5, { name: "" }, ACTOR),
    ).rejects.toThrow("Ingresa un nombre de categoría");

    expect(sb.updateCalls).toHaveLength(0);
  });

  it("DB error propagates (no logAudit called)", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: { message: "permission denied" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      updateTransactionCategory(5, { name: "Nombre" }, ACTOR),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setTransactionCategoryActive
// ---------------------------------------------------------------------------

describe("setTransactionCategoryActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates is_active=true for the given id", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setTransactionCategoryActive(3, true, ACTOR);

    const updateCall = sb.updateCalls.find((c) => c.table === "transaction_categories");
    expect(updateCall).toBeDefined();
    const payload = updateCall?.payload as Record<string, unknown>;
    expect(payload?.is_active).toBe(true);
  });

  it("updates is_active=false (deactivation)", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setTransactionCategoryActive(3, false, ACTOR);

    const updateCall = sb.updateCalls.find((c) => c.table === "transaction_categories");
    const payload = updateCall?.payload as Record<string, unknown>;
    expect(payload?.is_active).toBe(false);
  });

  it("applies filter by id", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setTransactionCategoryActive(8, true, ACTOR);

    const updateCall = sb.updateCalls.find((c) => c.table === "transaction_categories");
    const filters = updateCall?.filters ?? [];
    expect(filters.some(([col, val]) => col === "id" && val === 8)).toBe(true);
  });

  it("logAudit called with actualizar action and reactivation description", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setTransactionCategoryActive(4, true, ACTOR);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "actualizar",
        targetTable: "transaction_categories",
        targetId: 4,
        targetDescription: "Reactivar categoría",
      }),
    );
  });

  it("logAudit called with desactivation description when isActive=false", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setTransactionCategoryActive(4, false, ACTOR);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetDescription: "Desactivar categoría",
      }),
    );
  });

  it("DB error propagates (no logAudit called)", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: { message: "row not found" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      setTransactionCategoryActive(99, true, ACTOR),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

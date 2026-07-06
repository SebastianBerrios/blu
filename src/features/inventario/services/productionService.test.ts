/**
 * T3.1 — Tests for productionService.convertQty parity vs SQL _convert_qty,
 * and that produceRecipeBatch / reverseProduction call the right RPCs.
 *
 * convertQty wraps convert() with a ?? qty fallback for incompatible units.
 * SQL _convert_qty does the same: returns the original qty on incompatible pairs.
 *
 * DOCUMENTED LATENT BUG in the ?? qty fallback:
 * When convert() returns null (incompatible units), convertQty returns the
 * original qty unchanged. This silently passes an unconverted quantity to the
 * caller (e.g. fetchConsumption). For most callers this is wrong — the correct
 * behavior for an incompatible pair should arguably be to throw or surface a
 * warning. The SQL mirror _convert_qty does the same thing intentionally (to
 * avoid aborting a valid production), so this is a DOCUMENTED sync pair, not a
 * divergence. The fallback is consistent but callers must ensure units are
 * always compatible before calling. Test below documents this exact behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertQty, produceRecipeBatch, reverseProduction } from "./productionService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";
import type { Producible } from "@/types";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

// ---------------------------------------------------------------------------
// convertQty — table-driven parity with SQL _convert_qty semantics
// ---------------------------------------------------------------------------

describe("convertQty — parity with SQL _convert_qty", () => {
  // kg ↔ g conversions
  it("kg → g: 2 kg = 2000 g", () => {
    expect(convertQty(2, "kg", "g")).toBe(2000);
  });

  it("g → kg: 500 g = 0.5 kg", () => {
    expect(convertQty(500, "g", "kg")).toBe(0.5);
  });

  // l ↔ ml conversions
  it("l → ml: 1.5 l = 1500 ml", () => {
    expect(convertQty(1.5, "l", "ml")).toBe(1500);
  });

  it("ml → l: 250 ml = 0.25 l", () => {
    expect(convertQty(250, "ml", "l")).toBe(0.25);
  });

  // Same-unit (identity)
  it("same unit: qty returned unchanged", () => {
    expect(convertQty(5, "kg", "kg")).toBe(5);
    expect(convertQty(10, "ml", "ml")).toBe(10);
    expect(convertQty(3, "und", "und")).toBe(3);
  });

  // und ↔ peso via gramsPerUnit (unit_weight_g bridge)
  it("und → g with gramsPerUnit: 2 und × 185 g/und = 370 g", () => {
    expect(convertQty(2, "und", "g", 185)).toBe(370);
  });

  it("g → und with gramsPerUnit: 370 g ÷ 185 g/und = 2 und", () => {
    expect(convertQty(370, "g", "und", 185)).toBe(2);
  });

  it("und → kg with gramsPerUnit: 1 und × 500 g = 0.5 kg", () => {
    expect(convertQty(1, "und", "kg", 500)).toBe(0.5);
  });

  it("und → g without gramsPerUnit: returns qty unchanged (fallback, documented latent issue)", () => {
    // convert() returns null for incompatible pair → convertQty falls back to qty.
    // SQL _convert_qty mirrors this: returns p_qty unchanged if no conversion path.
    // LATENT BUG: caller receives unconverted qty silently; no error is surfaced.
    // This is an intentional sync pair — behavior is consistent TS↔SQL — but callers
    // must guarantee compatible units before invoking.
    const result = convertQty(5, "und", "g");
    expect(result).toBe(5); // fallback: unconverted qty returned, NOT null
  });

  it("incompatible (g → ml): returns qty unchanged (fallback)", () => {
    // Same documented ?? qty fallback for truly incompatible dimensions.
    const result = convertQty(100, "g", "ml");
    expect(result).toBe(100); // fallback to original qty, not converted
  });

  it("incompatible (kg → l): returns qty unchanged (fallback)", () => {
    const result = convertQty(2, "kg", "l");
    expect(result).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// produceRecipeBatch — calls produce_recipe_batch RPC with correct args
// ---------------------------------------------------------------------------

const makeProducible = (overrides: Partial<Producible> = {}): Producible => ({
  ingredient_id: 7,
  ingredient_name: "Brownie",
  ingredient_unit: "und",
  stock_quantity: 10,
  recipe_id: 3,
  recipe_name: "Brownie Batch",
  yield: 12,
  yield_unit: "und",
  ...overrides,
});

describe("produceRecipeBatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls produce_recipe_batch RPC with correct params", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await produceRecipeBatch(makeProducible(), 2, "user-1", "Seba");

    const call = sb.rpcCalls.find((c) => c.fn === "produce_recipe_batch");
    expect(call).toBeDefined();
    expect(call?.params).toMatchObject({
      p_ingredient_id: 7,
      p_batches: 2,
    });
  });

  it("logAudit called with producir_lote action after success", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await produceRecipeBatch(makeProducible(), 3, "user-1", "Chef");

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "producir_lote",
        targetTable: "productions",
        targetId: 7,
      }),
    );
  });

  it("RPC error propagates (no logAudit called)", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: { message: "stock insuficiente" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      produceRecipeBatch(makeProducible(), 1, "user-1", "Seba"),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("passes userId and userName to RPC", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await produceRecipeBatch(makeProducible(), 1, "user-42", "Maria");

    const call = sb.rpcCalls.find((c) => c.fn === "produce_recipe_batch");
    expect(call?.params).toMatchObject({
      p_user_id: "user-42",
      p_user_name: "Maria",
    });
  });

  it("handles null userId/userName (guest produce — maps to undefined in RPC)", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    // Should not throw; null maps to undefined in RPC params
    await expect(
      produceRecipeBatch(makeProducible(), 1, null, null),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// reverseProduction — calls reverse_production RPC with correct args
// ---------------------------------------------------------------------------

describe("reverseProduction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls reverse_production RPC with correct production id", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await reverseProduction(42, "Revertir lote Brownie", "user-1", "Seba");

    const call = sb.rpcCalls.find((c) => c.fn === "reverse_production");
    expect(call).toBeDefined();
    expect(call?.params).toMatchObject({ p_production_id: 42 });
  });

  it("logAudit called with revertir_produccion action after success", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await reverseProduction(42, "Revertir lote Brownie", "user-1", "Seba");

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "revertir_produccion",
        targetTable: "productions",
        targetId: 42,
      }),
    );
  });

  it("RPC error propagates (no logAudit called)", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: { message: "produccion no encontrada" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      reverseProduction(99, "desc", "user-1", "Seba"),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

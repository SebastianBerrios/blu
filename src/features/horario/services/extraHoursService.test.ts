import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createExtraHoursEntry,
  computeExtraHoursBalances,
} from "./extraHoursService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

describe("createExtraHoursEntry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("type=credit: hours positivo", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createExtraHoursEntry({
      userId: "u1",
      hours: 5,
      type: "credit",
      description: "Horas extra evento",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    const insert = sb.insertCalls.find((c) => c.table === "extra_hours_log")!;
    const payload = insert.payload as Record<string, unknown>;
    expect(payload.hours).toBe(5);
    expect(payload.reference_type).toBe("manual");
    expect(payload.created_by).toBe("admin");

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "registrar_horas_extra",
        targetDescription: expect.stringContaining("+5h"),
      }),
    );
  });

  it("type=debit: hours negativo + audit con '-' prefix", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createExtraHoursEntry({
      userId: "u1",
      hours: 3,
      type: "debit",
      description: "Anticipo",
      adminId: "admin",
      adminName: null,
      employeeName: "Seba",
    });

    const insert = sb.insertCalls.find((c) => c.table === "extra_hours_log")!;
    expect((insert.payload as Record<string, unknown>).hours).toBe(-3);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetDescription: expect.stringContaining("-3h"),
      }),
    );
  });

  it("error en insert: propaga sin audit", async () => {
    const sb = makeMockSupabase();
    sb.setResult("extra_hours_log", { error: { message: "x" } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      createExtraHoursEntry({
        userId: "u1",
        hours: 1,
        type: "credit",
        description: "x",
        adminId: "x",
        adminName: null,
        employeeName: "x",
      }),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

describe("computeExtraHoursBalances", () => {
  it("suma créditos y débitos por empleado y calcula balance neto", () => {
    const balances = computeExtraHoursBalances([
      { user_id: "u1", user_name: "Seba", hours: 5 },
      { user_id: "u1", user_name: "Seba", hours: -2 },
      { user_id: "u2", user_name: "Ana", hours: 3 },
    ]);

    const u1 = balances.find((b) => b.user_id === "u1")!;
    expect(u1.total_credits).toBe(5);
    expect(u1.total_debits).toBe(2);
    expect(u1.balance).toBe(3);

    const u2 = balances.find((b) => b.user_id === "u2")!;
    expect(u2.balance).toBe(3);
  });

  it("redondea horas fraccionarias y elimina ruido de punto flotante", () => {
    const [b] = computeExtraHoursBalances([
      { user_id: "u1", user_name: "Seba", hours: 0.1 },
      { user_id: "u1", user_name: "Seba", hours: 0.2 },
      { user_id: "u1", user_name: "Seba", hours: -0.15 },
    ]);

    // 0.1 + 0.2 = 0.30000000000000004 en float crudo; debe salir 0.3.
    expect(b.total_credits).toBe(0.3);
    expect(b.total_debits).toBe(0.15);
    expect(b.balance).toBe(0.15);
    // Sin ruido residual en la representación.
    expect(String(b.balance)).toBe("0.15");
  });

  it("usa 'Sin nombre' cuando user_name es null", () => {
    const [b] = computeExtraHoursBalances([
      { user_id: "u1", user_name: null, hours: 1 },
    ]);
    expect(b.user_name).toBe("Sin nombre");
  });

  it("lista vacía → sin balances", () => {
    expect(computeExtraHoursBalances([])).toEqual([]);
  });
});

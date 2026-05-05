import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExtraHoursEntry } from "./extraHoursService";
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

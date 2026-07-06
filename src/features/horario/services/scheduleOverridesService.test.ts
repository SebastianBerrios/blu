import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createScheduleOverrides,
  createExtraShift,
  updateExtraShift,
  deleteExtraShift,
  markAbsence,
} from "./scheduleOverridesService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

describe("createScheduleOverrides", () => {
  beforeEach(() => vi.clearAllMocks());

  it("isDayOff=true: una fila por user con start/end null", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createScheduleOverrides({
      userIds: ["u1", "u2"],
      overrideDate: "2026-05-15",
      isDayOff: true,
      startTime: "09:00",
      endTime: "13:00",
      reason: "Feriado",
      createdBy: "admin",
      adminId: "admin",
      adminName: "Admin",
      descriptionName: "Todo el equipo",
    });

    const insert = sb.insertCalls.find((c) => c.table === "schedule_overrides")!;
    const rows = insert.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: "u1",
      is_day_off: true,
      start_time: null,
      end_time: null,
      reason: "Feriado",
    });

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear" }),
    );
  });

  it("isDayOff=false: preserva start/end", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createScheduleOverrides({
      userIds: ["u1"],
      overrideDate: "2026-05-15",
      isDayOff: false,
      startTime: "09:00",
      endTime: "13:00",
      reason: "",
      createdBy: "admin",
      adminId: "admin",
      adminName: "Admin",
      descriptionName: "Seba",
    });

    const insert = sb.insertCalls.find((c) => c.table === "schedule_overrides")!;
    const row = (insert.payload as Array<Record<string, unknown>>)[0];
    expect(row.start_time).toBe("09:00");
    expect(row.end_time).toBe("13:00");
    expect(row.reason).toBeNull(); // string vacío → null
  });
});

describe("createExtraShift", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: insert override + insert hours + audit", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 200 }, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createExtraShift({
      userId: "u1",
      date: "2026-05-15",
      startTime: "18:00",
      endTime: "21:00",
      description: "Refuerzo",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    const overrideInsert = sb.insertCalls.find(
      (c) => c.table === "schedule_overrides",
    )!;
    const overridePayload = overrideInsert.payload as Record<string, unknown>;
    expect(overridePayload.is_extra_shift).toBe(true);
    expect(overridePayload.start_time).toBe("18:00");

    const hoursInsert = sb.insertCalls.find((c) => c.table === "extra_hours_log")!;
    const hoursPayload = hoursInsert.payload as Record<string, unknown>;
    expect(hoursPayload.hours).toBe(3);
    expect(hoursPayload.reference_type).toBe("extra_shift");
    expect(hoursPayload.reference_id).toBe(200);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear" }),
    );
  });

  it("hora fin <= inicio: throws antes de tocar la DB", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      createExtraShift({
        userId: "u1",
        date: "2026-05-15",
        startTime: "21:00",
        endTime: "21:00",
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
      }),
    ).rejects.toThrow("La hora fin debe ser mayor");

    expect(sb.insertCalls).toHaveLength(0);
  });
});

describe("updateExtraShift", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update override + update extra_hours + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateExtraShift({
      overrideId: 200,
      date: "2026-05-15",
      startTime: "19:00",
      endTime: "22:00",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    expect(sb.updateCalls.find((c) => c.table === "schedule_overrides")).toBeDefined();
    expect(sb.updateCalls.find((c) => c.table === "extra_hours_log")).toBeDefined();
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "actualizar", targetId: 200 }),
    );
  });

  it("hora inválida: throws", async () => {
    await expect(
      updateExtraShift({
        overrideId: 1,
        date: "2026-05-15",
        startTime: "10:00",
        endTime: "09:00",
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
      }),
    ).rejects.toThrow();
  });
});

describe("deleteExtraShift", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delete extra_hours_log primero, luego schedule_overrides", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await deleteExtraShift({
      overrideId: 200,
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
      date: "2026-05-15",
    });

    expect(sb.deleteCalls.map((c) => c.table)).toEqual([
      "extra_hours_log",
      "schedule_overrides",
    ]);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "eliminar" }),
    );
  });
});

describe("markAbsence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mode='full': insert override con missedStart=shiftStart, missedEnd=shiftEnd, hours negativas", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 300 }, error: null } });
    sb.setResult("schedule_overrides", { data: [] });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await markAbsence({
      userId: "u1",
      date: "2026-05-15",
      shiftStart: "09:00",
      shiftEnd: "13:00",
      mode: "full",
      reason: "Inasistencia justificada",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    const overrideInsert = sb.insertCalls.find((c) => c.table === "schedule_overrides")!;
    const payload = overrideInsert.payload as Record<string, unknown>;
    expect(payload.is_day_off).toBe(true);
    expect(payload.is_absence).toBe(true);
    expect(payload.start_time).toBe("09:00");
    expect(payload.end_time).toBe("13:00");

    const hoursInsert = sb.insertCalls.find((c) => c.table === "extra_hours_log")!;
    expect((hoursInsert.payload as Record<string, unknown>).hours).toBe(-4);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "marcar_inasistencia" }),
    );
  });

  it("mode='late' sin actualTime: throws 'Falta la hora de llegada'", async () => {
    await expect(
      markAbsence({
        userId: "u1",
        date: "2026-05-15",
        shiftStart: "09:00",
        shiftEnd: "13:00",
        mode: "late",
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
      }),
    ).rejects.toThrow("Falta la hora de llegada");
  });

  it("mode='late' con actualTime válido: marca tardanza con missedStart=shiftStart", async () => {
    const sb = makeMockSupabase({ single: { data: { id: 300 }, error: null } });
    sb.setResult("schedule_overrides", { data: [] });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await markAbsence({
      userId: "u1",
      date: "2026-05-15",
      shiftStart: "09:00",
      shiftEnd: "13:00",
      mode: "late",
      actualTime: "09:30",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    const overrideInsert = sb.insertCalls.find((c) => c.table === "schedule_overrides")!;
    const payload = overrideInsert.payload as Record<string, unknown>;
    expect(payload.start_time).toBe("09:00");
    expect(payload.end_time).toBe("09:30");
    expect(payload.is_day_off).toBe(false);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "marcar_tardanza" }),
    );
  });
});

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

  it("happy path: calls create_extra_shift_atomic RPC with correct params + audit", async () => {
    const sb = makeMockSupabase({ rpc: { data: 200, error: null } });
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

    expect(sb.rpcCalls).toHaveLength(1);
    expect(sb.rpcCalls[0].fn).toBe("create_extra_shift_atomic");
    expect(sb.rpcCalls[0].params).toMatchObject({
      p_user_id: "u1",
      p_date: "2026-05-15",
      p_start_time: "18:00",
      p_end_time: "21:00",
      p_reason: "Refuerzo",
      p_log_description: "Turno extra 2026-05-15 (18:00-21:00)",
      p_admin_id: "admin",
    });

    // No direct table inserts
    expect(sb.insertCalls).toHaveLength(0);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crear" }),
    );
  });

  it("default reason when description is omitted", async () => {
    const sb = makeMockSupabase({ rpc: { data: 201, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createExtraShift({
      userId: "u1",
      date: "2026-05-15",
      startTime: "18:00",
      endTime: "21:00",
      adminId: "admin",
      adminName: null,
      employeeName: "Seba",
    });

    expect(sb.rpcCalls[0].params).toMatchObject({ p_reason: "Turno extra" });
  });

  it("propagates RPC error", async () => {
    const rpcError = new Error("RPC failed");
    const sb = makeMockSupabase({ rpc: { data: null, error: rpcError } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      createExtraShift({
        userId: "u1",
        date: "2026-05-15",
        startTime: "18:00",
        endTime: "21:00",
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
      }),
    ).rejects.toThrow("RPC failed");

    expect(mockedLogAudit).not.toHaveBeenCalled();
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

    expect(sb.rpcCalls).toHaveLength(0);
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

  it("mode='full': calls mark_absence_atomic with correct params and fires audit", async () => {
    const sb = makeMockSupabase({ rpc: { data: 300, error: null } });
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

    expect(sb.rpcCalls).toHaveLength(1);
    expect(sb.rpcCalls[0].fn).toBe("mark_absence_atomic");
    expect(sb.rpcCalls[0].params).toMatchObject({
      p_user_id: "u1",
      p_date: "2026-05-15",
      p_missed_start: "09:00",
      p_missed_end: "13:00",
      p_is_day_off: true,
      p_reason: "Inasistencia justificada",
      p_log_description: "Inasistencia 2026-05-15 (09:00-13:00)",
      p_admin_id: "admin",
    });

    // No direct table inserts or client-side dup selects
    expect(sb.insertCalls).toHaveLength(0);
    expect(sb.selectCalls.filter((c) => c.table === "schedule_overrides")).toHaveLength(0);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "marcar_inasistencia" }),
    );
  });

  it("mode='late' con actualTime: calls RPC with missedStart=shiftStart, missedEnd=actualTime", async () => {
    const sb = makeMockSupabase({ rpc: { data: 301, error: null } });
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

    expect(sb.rpcCalls[0].fn).toBe("mark_absence_atomic");
    expect(sb.rpcCalls[0].params).toMatchObject({
      p_missed_start: "09:00",
      p_missed_end: "09:30",
      p_is_day_off: false,
      p_reason: "Tardanza",
    });

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "marcar_tardanza" }),
    );
  });

  it("mode='early' con actualTime: calls RPC with missedStart=actualTime, missedEnd=shiftEnd", async () => {
    const sb = makeMockSupabase({ rpc: { data: 302, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await markAbsence({
      userId: "u1",
      date: "2026-05-15",
      shiftStart: "09:00",
      shiftEnd: "13:00",
      mode: "early",
      actualTime: "12:00",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    expect(sb.rpcCalls[0].fn).toBe("mark_absence_atomic");
    expect(sb.rpcCalls[0].params).toMatchObject({
      p_missed_start: "12:00",
      p_missed_end: "13:00",
      p_is_day_off: false,
      p_reason: "Salida temprana",
    });

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "marcar_salida_temprana" }),
    );
  });

  it("propagates RPC error (including dup-check message from DB)", async () => {
    const rpcError = new Error("Ya existe un registro para este rango de tiempo");
    const sb = makeMockSupabase({ rpc: { data: null, error: rpcError } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      markAbsence({
        userId: "u1",
        date: "2026-05-15",
        shiftStart: "09:00",
        shiftEnd: "13:00",
        mode: "full",
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
      }),
    ).rejects.toThrow("Ya existe un registro para este rango de tiempo");

    expect(mockedLogAudit).not.toHaveBeenCalled();
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

  it("mode='late' con actualTime <= shiftStart: throws", async () => {
    await expect(
      markAbsence({
        userId: "u1",
        date: "2026-05-15",
        shiftStart: "09:00",
        shiftEnd: "13:00",
        mode: "late",
        actualTime: "08:30",
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
      }),
    ).rejects.toThrow("La hora de llegada debe ser posterior al inicio del turno");
  });

  it("mode='early' sin actualTime: throws 'Falta la hora de salida'", async () => {
    await expect(
      markAbsence({
        userId: "u1",
        date: "2026-05-15",
        shiftStart: "09:00",
        shiftEnd: "13:00",
        mode: "early",
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
      }),
    ).rejects.toThrow("Falta la hora de salida");
  });
});

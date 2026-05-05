import { describe, it, expect } from "vitest";
import type {
  ScheduleTemplate,
  ScheduleOverride,
  ScheduleUser,
  DayOfWeek,
} from "@/types";
import {
  computeWorkingSlots,
  mergeTemplatesAndOverrides,
} from "./scheduleMerge";

describe("computeWorkingSlots", () => {
  it("retorna [] cuando el time-off cubre todo el template", () => {
    expect(computeWorkingSlots("09:00", "17:00", "08:00", "18:00")).toEqual([]);
  });

  it("retorna el template intacto cuando el time-off no se solapa", () => {
    expect(computeWorkingSlots("09:00", "13:00", "14:00", "16:00")).toEqual([
      { start_time: "09:00", end_time: "13:00" },
    ]);
  });

  it("recorta el final cuando time-off cubre el inicio", () => {
    expect(computeWorkingSlots("09:00", "17:00", "08:00", "12:00")).toEqual([
      { start_time: "12:00", end_time: "17:00" },
    ]);
  });

  it("recorta el inicio cuando time-off cubre el final", () => {
    expect(computeWorkingSlots("09:00", "17:00", "14:00", "18:00")).toEqual([
      { start_time: "09:00", end_time: "14:00" },
    ]);
  });

  it("parte en dos cuando el time-off está en el medio", () => {
    expect(computeWorkingSlots("09:00", "17:00", "12:00", "14:00")).toEqual([
      { start_time: "09:00", end_time: "12:00" },
      { start_time: "14:00", end_time: "17:00" },
    ]);
  });

  it("normaliza tiempos con segundos a HH:MM", () => {
    expect(
      computeWorkingSlots("09:00:00", "17:00:00", "12:00:00", "14:00:00"),
    ).toEqual([
      { start_time: "09:00", end_time: "12:00" },
      { start_time: "14:00", end_time: "17:00" },
    ]);
  });
});

// ----------------------------------------------------------------------------
// Test helpers / fixtures for mergeTemplatesAndOverrides
// ----------------------------------------------------------------------------

function tmpl(
  overrides: Partial<ScheduleTemplate> &
    Pick<ScheduleTemplate, "user_id" | "day_of_week" | "start_time" | "end_time">,
): ScheduleTemplate {
  return {
    id: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  } as ScheduleTemplate;
}

function ov(
  overrides: Partial<ScheduleOverride> &
    Pick<ScheduleOverride, "user_id" | "override_date">,
): ScheduleOverride {
  return {
    id: 100,
    created_at: "2026-01-01",
    created_by: null,
    is_day_off: false,
    is_extra_shift: false,
    is_absence: false,
    reason: null,
    start_time: null,
    end_time: null,
    time_off_request_id: null,
    ...overrides,
  } as ScheduleOverride;
}

const USER: ScheduleUser = {
  id: "u1",
  full_name: "Seba",
  role: "barista",
};

const getDayOfWeek: (date: string, idx: number) => DayOfWeek = () => 0; // Always Monday for simplicity

describe("mergeTemplatesAndOverrides", () => {
  it("renderiza templates sin overrides como slots no-override", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "13:00" })],
      [],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      user_id: "u1",
      start_time: "09:00",
      end_time: "13:00",
      is_override: false,
      is_day_off: false,
    });
  });

  it("agrega un extra shift como slot adicional con is_extra_shift=true", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "13:00" })],
      [
        ov({
          id: 50,
          user_id: "u1",
          override_date: "2026-05-04",
          start_time: "18:00",
          end_time: "21:00",
          is_extra_shift: true,
          reason: "Refuerzo",
        }),
      ],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    const extra = result.find((s) => s.is_extra_shift);
    expect(extra).toMatchObject({
      start_time: "18:00",
      end_time: "21:00",
      is_override: true,
      is_extra_shift: true,
      override_reason: "Refuerzo",
      override_id: 50,
    });
  });

  it("override de día completo (sin start/end) reemplaza todos los templates del día con is_day_off", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "13:00" })],
      [
        ov({
          user_id: "u1",
          override_date: "2026-05-04",
          is_day_off: true,
          reason: "Feriado",
        }),
      ],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      is_override: true,
      is_day_off: true,
      override_reason: "Feriado",
    });
  });

  it("time-off parcial (con time_off_request_id) parte el template + agrega bloque de descanso", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "17:00" })],
      [
        ov({
          user_id: "u1",
          override_date: "2026-05-04",
          start_time: "12:00",
          end_time: "14:00",
          time_off_request_id: 99,
          reason: "Permiso médico",
        }),
      ],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    // Esperado: 09-12 trabajo, 14-17 trabajo, 12-14 descanso
    expect(result).toHaveLength(3);
    const work = result.filter((s) => !s.is_day_off);
    expect(work.map((s) => `${s.start_time}-${s.end_time}`)).toEqual([
      "09:00-12:00",
      "14:00-17:00",
    ]);
    const off = result.find((s) => s.is_day_off);
    expect(off).toMatchObject({ start_time: "12:00", end_time: "14:00" });
  });

  it("ausencia parcial al inicio del turno marca attendanceIssue type='late'", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "17:00" })],
      [
        ov({
          id: 7,
          user_id: "u1",
          override_date: "2026-05-04",
          start_time: "09:00",
          end_time: "10:30",
          is_absence: true,
          reason: "Tardanza",
        }),
      ],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    expect(result).toHaveLength(1);
    expect(result[0].attendanceIssue).toMatchObject({
      type: "late",
      minutes: 90,
      overrideId: 7,
    });
  });

  it("ausencia parcial al final del turno marca attendanceIssue type='early'", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "17:00" })],
      [
        ov({
          id: 8,
          user_id: "u1",
          override_date: "2026-05-04",
          start_time: "15:30",
          end_time: "17:00",
          is_absence: true,
          reason: "Salió temprano",
        }),
      ],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    expect(result[0].attendanceIssue).toMatchObject({
      type: "early",
      minutes: 90,
      overrideId: 8,
    });
  });

  it("ausencia que cubre todo el turno reemplaza el slot con is_day_off + is_absence", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "13:00" })],
      [
        ov({
          user_id: "u1",
          override_date: "2026-05-04",
          start_time: "09:00",
          end_time: "13:00",
          is_absence: true,
          reason: "Faltó",
        }),
      ],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      is_override: true,
      is_day_off: true,
      is_absence: true,
    });
  });

  it("override parcial sin template adyacente se renderiza como standalone slot", () => {
    const result = mergeTemplatesAndOverrides(
      [],
      [
        ov({
          user_id: "u1",
          override_date: "2026-05-04",
          start_time: "10:00",
          end_time: "12:00",
          reason: "Reemplazo",
        }),
      ],
      [USER],
      ["2026-05-04"],
      getDayOfWeek,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      start_time: "10:00",
      end_time: "12:00",
      is_override: true,
      override_reason: "Reemplazo",
    });
  });

  it("user con full_name null usa fallback 'Sin nombre'", () => {
    const result = mergeTemplatesAndOverrides(
      [tmpl({ user_id: "u1", day_of_week: 0, start_time: "09:00", end_time: "13:00" })],
      [],
      [{ id: "u1", full_name: null, role: "barista" }],
      ["2026-05-04"],
      getDayOfWeek,
    );
    expect(result[0].user_name).toBe("Sin nombre");
  });
});

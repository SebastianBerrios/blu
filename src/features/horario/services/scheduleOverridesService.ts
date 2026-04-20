import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { AbsenceMode } from "@/types";

function computeShiftHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return endH + endM / 60 - (startH + startM / 60);
}

export async function createScheduleOverrides(params: {
  userIds: string[];
  overrideDate: string;
  isDayOff: boolean;
  startTime: string;
  endTime: string;
  reason: string;
  createdBy: string | null;
  adminId: string | null;
  adminName: string | null;
  descriptionName: string;
}): Promise<void> {
  const {
    userIds,
    overrideDate,
    isDayOff,
    startTime,
    endTime,
    reason,
    createdBy,
    adminId,
    adminName,
    descriptionName,
  } = params;
  const supabase = createClient();

  const rows = userIds.map((uid) => ({
    user_id: uid,
    override_date: overrideDate,
    is_day_off: isDayOff,
    start_time: isDayOff ? null : startTime,
    end_time: isDayOff ? null : endTime,
    reason: reason || null,
    created_by: createdBy,
  }));

  const { error } = await supabase.from("schedule_overrides").insert(rows);
  if (error) throw error;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "crear",
    targetTable: "schedule_overrides",
    targetDescription: `Excepción ${overrideDate} para ${descriptionName}: ${
      isDayOff ? "Día libre" : `${startTime}-${endTime}`
    }`,
  });
}

export async function createExtraShift(params: {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  adminId: string;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const { userId, date, startTime, endTime, description, adminId, adminName, employeeName } = params;
  const supabase = createClient();

  const hours = computeShiftHours(startTime, endTime);
  if (hours <= 0) throw new Error("La hora fin debe ser mayor a la hora inicio");

  // 1. Insert schedule override
  const { data: override, error: overrideError } = await supabase
    .from("schedule_overrides")
    .insert({
      user_id: userId,
      override_date: date,
      is_day_off: false,
      start_time: startTime,
      end_time: endTime,
      reason: description || "Turno extra",
      is_extra_shift: true,
      created_by: adminId,
    })
    .select("id")
    .single();

  if (overrideError) throw overrideError;

  // 2. Insert extra hours credit
  const { error: hoursError } = await supabase.from("extra_hours_log").insert({
    user_id: userId,
    hours: Math.round(hours * 100) / 100,
    description: `Turno extra ${date} (${startTime}-${endTime})`,
    reference_type: "extra_shift",
    reference_id: override.id,
    created_by: adminId,
  });

  if (hoursError) {
    // Cleanup: remove the override if hours insert fails
    await supabase.from("schedule_overrides").delete().eq("id", override.id);
    throw hoursError;
  }

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "crear",
    targetTable: "extra_hours_log",
    targetDescription: `Turno extra ${date} ${startTime}-${endTime} para ${employeeName} (${hours.toFixed(1)}h)`,
    details: { employee_id: userId, date, startTime, endTime, hours },
  });
}

export async function updateExtraShift(params: {
  overrideId: number;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  adminId: string;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const { overrideId, date, startTime, endTime, description, adminId, adminName, employeeName } = params;
  const supabase = createClient();

  const hours = computeShiftHours(startTime, endTime);
  if (hours <= 0) throw new Error("La hora fin debe ser mayor a la hora inicio");

  // 1. Update schedule override
  const { error: overrideError } = await supabase
    .from("schedule_overrides")
    .update({
      override_date: date,
      start_time: startTime,
      end_time: endTime,
      reason: description || "Turno extra",
    })
    .eq("id", overrideId);

  if (overrideError) throw overrideError;

  // 2. Update extra_hours_log
  const roundedHours = Math.round(hours * 100) / 100;
  const { error: hoursError } = await supabase
    .from("extra_hours_log")
    .update({
      hours: roundedHours,
      description: `Turno extra ${date} (${startTime}-${endTime})`,
    })
    .eq("reference_type", "extra_shift")
    .eq("reference_id", overrideId);

  if (hoursError) throw hoursError;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "actualizar",
    targetTable: "schedule_overrides",
    targetId: overrideId,
    targetDescription: `Turno extra ${date} ${startTime}-${endTime} de ${employeeName} (${roundedHours}h)`,
    details: { date, startTime, endTime, hours: roundedHours },
  });
}

export async function deleteExtraShift(params: {
  overrideId: number;
  adminId: string;
  adminName: string | null;
  employeeName: string;
  date: string;
}): Promise<void> {
  const { overrideId, adminId, adminName, employeeName, date } = params;
  const supabase = createClient();

  // 1. Delete associated extra_hours_log entry FIRST
  const { error: hoursError } = await supabase
    .from("extra_hours_log")
    .delete()
    .eq("reference_type", "extra_shift")
    .eq("reference_id", overrideId);

  if (hoursError) throw hoursError;

  // 2. Delete the schedule override (only if hours cleanup succeeded)
  const { error } = await supabase
    .from("schedule_overrides")
    .delete()
    .eq("id", overrideId);

  if (error) throw error;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "eliminar",
    targetTable: "schedule_overrides",
    targetId: overrideId,
    targetDescription: `Turno extra ${date} eliminado de ${employeeName}`,
  });
}

/**
 * Registers an attendance issue against a scheduled shift. The override represents
 * the *missed* portion of the shift:
 *   - full  → start/end = shift start/end (employee didn't show up)
 *   - late  → start = shift start, end = actual arrival time
 *   - early → start = actual departure time, end = shift end
 * Hours are debited proportional to the missed minutes.
 */
export async function markAbsence(params: {
  userId: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  mode: AbsenceMode;
  actualTime?: string;
  reason?: string;
  adminId: string;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const {
    userId,
    date,
    shiftStart,
    shiftEnd,
    mode,
    actualTime,
    reason,
    adminId,
    adminName,
    employeeName,
  } = params;
  const supabase = createClient();

  let missedStart: string;
  let missedEnd: string;

  if (mode === "full") {
    missedStart = shiftStart;
    missedEnd = shiftEnd;
  } else if (mode === "late") {
    if (!actualTime) throw new Error("Falta la hora de llegada");
    if (actualTime <= shiftStart) throw new Error("La hora de llegada debe ser posterior al inicio del turno");
    if (actualTime >= shiftEnd) throw new Error("La hora de llegada debe ser anterior al fin del turno");
    missedStart = shiftStart;
    missedEnd = actualTime;
  } else {
    if (!actualTime) throw new Error("Falta la hora de salida");
    if (actualTime <= shiftStart) throw new Error("La hora de salida debe ser posterior al inicio del turno");
    if (actualTime >= shiftEnd) throw new Error("La hora de salida debe ser anterior al fin del turno");
    missedStart = actualTime;
    missedEnd = shiftEnd;
  }

  const missedHours = computeShiftHours(missedStart, missedEnd);
  if (missedHours <= 0) throw new Error("Rango inválido");
  const missedMinutes = Math.round(missedHours * 60);

  // Prevent duplicates for the same shift range on the same date.
  const { data: existing } = await supabase
    .from("schedule_overrides")
    .select("id, start_time, end_time")
    .eq("user_id", userId)
    .eq("override_date", date)
    .eq("is_absence", true);

  if (existing) {
    const duplicate = existing.find((o) => {
      const s = (o.start_time ?? "").slice(0, 5);
      const e = (o.end_time ?? "").slice(0, 5);
      return s === missedStart && e === missedEnd;
    });
    if (duplicate) {
      throw new Error("Ya existe un registro para este rango de tiempo");
    }
  }

  const { data: override, error: overrideError } = await supabase
    .from("schedule_overrides")
    .insert({
      user_id: userId,
      override_date: date,
      is_day_off: mode === "full",
      is_absence: true,
      start_time: missedStart,
      end_time: missedEnd,
      reason: reason || (mode === "full" ? "Inasistencia" : mode === "late" ? "Tardanza" : "Salida temprana"),
      created_by: adminId,
    })
    .select("id")
    .single();

  if (overrideError) throw overrideError;

  const roundedHours = Math.round(missedHours * 100) / 100;
  const description =
    mode === "full"
      ? `Inasistencia ${date} (${missedStart}-${missedEnd})`
      : mode === "late"
      ? `Tardanza ${date}: ${missedMinutes} min`
      : `Salida temprana ${date}: ${missedMinutes} min`;

  const { error: hoursError } = await supabase.from("extra_hours_log").insert({
    user_id: userId,
    hours: -roundedHours,
    description,
    reference_type: "absence",
    reference_id: override.id,
    created_by: adminId,
  });

  if (hoursError) {
    await supabase.from("schedule_overrides").delete().eq("id", override.id);
    throw hoursError;
  }

  logAudit({
    userId: adminId,
    userName: adminName,
    action: mode === "full" ? "marcar_inasistencia" : mode === "late" ? "marcar_tardanza" : "marcar_salida_temprana",
    targetTable: "schedule_overrides",
    targetId: override.id,
    targetDescription: `${description} de ${employeeName} (-${roundedHours}h)`,
    details: { employee_id: userId, date, mode, missedStart, missedEnd, hours: roundedHours },
  });
}

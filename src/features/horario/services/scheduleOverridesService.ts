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

  const reason = description || "Turno extra";
  const logDescription = `Turno extra ${date} (${startTime}-${endTime})`;

  const { error } = await supabase.rpc("create_extra_shift_atomic", {
    p_user_id: userId,
    p_date: date,
    p_start_time: startTime,
    p_end_time: endTime,
    p_reason: reason,
    p_log_description: logDescription,
    p_admin_id: adminId,
  });

  if (error) throw error;

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
  const roundedHours = Math.round(missedHours * 100) / 100;

  const description =
    mode === "full"
      ? `Inasistencia ${date} (${missedStart}-${missedEnd})`
      : mode === "late"
      ? `Tardanza ${date}: ${missedMinutes} min`
      : `Salida temprana ${date}: ${missedMinutes} min`;

  const { data: overrideId, error } = await supabase.rpc("mark_absence_atomic", {
    p_user_id: userId,
    p_date: date,
    p_missed_start: missedStart,
    p_missed_end: missedEnd,
    p_is_day_off: mode === "full",
    p_reason: reason || (mode === "full" ? "Inasistencia" : mode === "late" ? "Tardanza" : "Salida temprana"),
    p_log_description: description,
    p_admin_id: adminId,
  });

  if (error) throw error;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: mode === "full" ? "marcar_inasistencia" : mode === "late" ? "marcar_tardanza" : "marcar_salida_temprana",
    targetTable: "schedule_overrides",
    targetId: overrideId ?? undefined,
    targetDescription: `${description} de ${employeeName} (-${roundedHours}h)`,
    details: { employee_id: userId, date, mode, missedStart, missedEnd, hours: roundedHours },
  });
}

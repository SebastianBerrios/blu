import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { DAY_LABELS } from "@/types/schedule";
import type { DayOfWeek } from "@/types";

export async function deleteTemplate(
  templateId: number,
  userId: string | null,
  userName: string | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("schedule_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "eliminar",
    targetTable: "schedule_templates",
    targetId: templateId,
    targetDescription: "Turno eliminado",
  });
}

export async function getExistingTemplates(
  userId: string,
  days: DayOfWeek[]
): Promise<{ id: number; day_of_week: number }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_templates")
    .select("id, day_of_week")
    .eq("user_id", userId)
    .in("day_of_week", days);

  if (error) throw error;
  return data ?? [];
}

export async function deleteTemplatesForDays(
  userId: string,
  days: DayOfWeek[],
  adminId: string | null,
  adminName: string | null,
  employeeName: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("schedule_templates")
    .delete()
    .eq("user_id", userId)
    .in("day_of_week", days);

  if (error) throw error;

  const dayNames = days.map((d) => DAY_LABELS[d]).join(", ");
  logAudit({
    userId: adminId,
    userName: adminName,
    action: "eliminar",
    targetTable: "schedule_templates",
    targetDescription: `Turnos reemplazados (${dayNames}) de ${employeeName}`,
    details: { days, employee_id: userId },
  });
}

export async function createTemplates(params: {
  userId: string;
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
  adminId: string | null;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const { userId, days, startTime, endTime, adminId, adminName, employeeName } = params;
  const supabase = createClient();

  const rows = days.map((d) => ({
    user_id: userId,
    day_of_week: d,
    start_time: startTime,
    end_time: endTime,
  }));

  const { error } = await supabase.from("schedule_templates").insert(rows);
  if (error) throw error;

  const dayNames = days.map((d) => DAY_LABELS[d]).join(", ");
  logAudit({
    userId: adminId,
    userName: adminName,
    action: "crear",
    targetTable: "schedule_templates",
    targetDescription: `Horario ${dayNames} ${startTime}-${endTime} para ${employeeName}`,
    details: { days, startTime, endTime, employee_id: userId },
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

  // Calculate hours
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const hours = endH + endM / 60 - (startH + startM / 60);

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

export async function markAbsence(params: {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  adminId: string;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const { userId, date, startTime, endTime, reason, adminId, adminName, employeeName } = params;
  const supabase = createClient();

  // Calculate hours
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const hours = endH + endM / 60 - (startH + startM / 60);

  if (hours <= 0) throw new Error("Turno inválido");

  // Check for existing absence on this date for this user
  const { data: existing } = await supabase
    .from("schedule_overrides")
    .select("id")
    .eq("user_id", userId)
    .eq("override_date", date)
    .eq("is_absence", true)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("Ya existe una inasistencia registrada para este empleado en esta fecha");
  }

  // 1. Insert schedule override
  const { data: override, error: overrideError } = await supabase
    .from("schedule_overrides")
    .insert({
      user_id: userId,
      override_date: date,
      is_day_off: true,
      is_absence: true,
      start_time: startTime,
      end_time: endTime,
      reason: reason || "Inasistencia",
      created_by: adminId,
    })
    .select("id")
    .single();

  if (overrideError) throw overrideError;

  // 2. Insert hours debit (negative)
  const roundedHours = Math.round(hours * 100) / 100;
  const { error: hoursError } = await supabase.from("extra_hours_log").insert({
    user_id: userId,
    hours: -roundedHours,
    description: `Inasistencia ${date} (${startTime}-${endTime})`,
    reference_type: "absence",
    reference_id: override.id,
    created_by: adminId,
  });

  if (hoursError) {
    // Rollback: remove the override
    await supabase.from("schedule_overrides").delete().eq("id", override.id);
    throw hoursError;
  }

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "marcar_inasistencia",
    targetTable: "schedule_overrides",
    targetId: override.id,
    targetDescription: `Inasistencia ${date} ${startTime}-${endTime} de ${employeeName} (-${roundedHours}h)`,
    details: { employee_id: userId, date, startTime, endTime, hours: roundedHours },
  });
}

export async function updateTemplate(params: {
  templateId: number;
  userId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  adminId: string | null;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const { templateId, userId, dayOfWeek, startTime, endTime, adminId, adminName, employeeName } = params;
  const supabase = createClient();

  const { error } = await supabase
    .from("schedule_templates")
    .update({
      user_id: userId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    })
    .eq("id", templateId);

  if (error) throw error;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "actualizar",
    targetTable: "schedule_templates",
    targetId: templateId,
    targetDescription: `Horario ${DAY_LABELS[dayOfWeek]} ${startTime}-${endTime} para ${employeeName}`,
  });
}

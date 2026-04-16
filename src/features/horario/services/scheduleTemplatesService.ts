import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { DAY_LABELS } from "@/types/schedule";
import type { DayOfWeek } from "@/types";

export async function deleteTemplate(
  templateId: number,
  userId: string | null,
  userName: string | null
): Promise<void> {
  await deleteWithAudit({
    table: "schedule_templates",
    id: templateId,
    userId,
    userName,
    auditTable: "schedule_templates",
    description: "Turno eliminado",
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

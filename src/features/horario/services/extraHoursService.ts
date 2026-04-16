import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";

export async function createExtraHoursEntry(params: {
  userId: string;
  hours: number;
  type: "credit" | "debit";
  description: string;
  adminId: string;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const supabase = createClient();
  const finalHours = params.type === "debit" ? -params.hours : params.hours;
  const { error } = await supabase.from("extra_hours_log").insert({
    user_id: params.userId,
    hours: finalHours,
    description: params.description,
    reference_type: "manual",
    created_by: params.adminId,
  });
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "registrar_horas_extra",
    targetTable: "extra_hours_log",
    targetDescription: `${params.type === "debit" ? "-" : "+"}${params.hours}h para ${params.employeeName}: ${params.description}`,
  });
}

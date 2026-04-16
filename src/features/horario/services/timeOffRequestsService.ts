import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";

export async function createTimeOffRequest(params: {
  userId: string;
  requestedDate: string;
  isFullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  hoursRequested: number;
  reason: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("time_off_requests").insert({
    user_id: params.userId,
    requested_date: params.requestedDate,
    is_full_day: params.isFullDay,
    start_time: params.isFullDay ? null : params.startTime,
    end_time: params.isFullDay ? null : params.endTime,
    hours_requested: params.hoursRequested,
    reason: params.reason,
  });
  if (error) throw error;
}

export async function approveTimeOffRequest(params: {
  requestId: number;
  adminId: string;
  adminName: string | null;
  employeeName: string;
  requestedDate: string;
  hoursRequested: number;
  reviewNote: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_time_off_request", {
    p_request_id: params.requestId,
    p_admin_id: params.adminId,
    p_review_note: params.reviewNote,
  });
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "aprobar_permiso",
    targetTable: "time_off_requests",
    targetId: params.requestId,
    targetDescription: `Permiso aprobado para ${params.employeeName}: ${params.requestedDate} (${params.hoursRequested}h)`,
  });
}

export async function rejectTimeOffRequest(params: {
  requestId: number;
  adminId: string;
  adminName: string | null;
  employeeName: string;
  requestedDate: string;
  reviewNote: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: "rechazado",
      reviewed_by: params.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: params.reviewNote,
    })
    .eq("id", params.requestId);

  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "rechazar_permiso",
    targetTable: "time_off_requests",
    targetId: params.requestId,
    targetDescription: `Permiso rechazado para ${params.employeeName}: ${params.requestedDate}`,
  });
}

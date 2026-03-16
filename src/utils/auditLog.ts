import { createClient } from "@/utils/supabase/client";
import type { AuditAction, AuditTargetTable } from "@/types/auditLog";

export async function logAudit(params: {
  userId: string | null;
  userName: string | null;
  action: AuditAction;
  targetTable: AuditTargetTable;
  targetId?: string | number;
  targetDescription?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      user_name: params.userName,
      action: params.action,
      target_table: params.targetTable,
      target_id: params.targetId != null ? String(params.targetId) : null,
      target_description: params.targetDescription ?? null,
      details: params.details ?? {},
    });
  } catch {
    // Fire-and-forget: never block the main operation
  }
}

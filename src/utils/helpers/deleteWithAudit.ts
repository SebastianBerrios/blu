import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { AuditTargetTable } from "@/types/auditLog";

interface DeleteWithAuditParams {
  table: string;
  id: number;
  userId: string | null;
  userName: string | null;
  auditTable: AuditTargetTable;
  description: string;
}

export async function deleteWithAudit({
  table,
  id,
  userId,
  userName,
  auditTable,
  description,
}: DeleteWithAuditParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar: ${error.message}`);
  logAudit({
    userId,
    userName,
    action: "eliminar",
    targetTable: auditTable,
    targetId: id,
    targetDescription: description,
  });
}

import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { AppRole } from "@/types/auth";
import type { PermissionKey } from "@/types/permissions";

interface SetRolePermissionParams {
  role: Exclude<AppRole, "admin">;
  permission: PermissionKey;
  enabled: boolean;
  adminId: string | null;
  adminName: string | null;
}

export async function setRolePermission(params: SetRolePermissionParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("role_permissions")
    .upsert(
      {
        role: params.role,
        permission: params.permission,
        enabled: params.enabled,
        updated_at: new Date().toISOString(),
        updated_by: params.adminId,
      },
      { onConflict: "role,permission" }
    );
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "cambiar_permiso",
    targetTable: "role_permissions",
    targetId: `${params.role}:${params.permission}`,
    targetDescription: `Permiso ${params.permission} para ${params.role} → ${params.enabled ? "activado" : "desactivado"}`,
    details: { role: params.role, permission: params.permission, enabled: params.enabled },
  });
}

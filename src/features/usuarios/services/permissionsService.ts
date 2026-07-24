import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { AppRole } from "@/types/auth";
import type { PermissionKey, UserPermission } from "@/types/permissions";

/** Fetches the per-user permission overrides for a single user (admin view). */
export async function fetchUserOverrides(userId: string): Promise<UserPermission[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_permissions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

interface SetUserPermissionParams {
  userId: string;
  permission: PermissionKey;
  enabled: boolean;
  adminId: string | null;
  adminName: string | null;
}

interface ClearUserPermissionParams {
  userId: string;
  permission: PermissionKey;
  adminId: string | null;
  adminName: string | null;
}

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

export async function setUserPermission(params: SetUserPermissionParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_permissions")
    .upsert(
      {
        user_id: params.userId,
        permission: params.permission,
        enabled: params.enabled,
        updated_at: new Date().toISOString(),
        updated_by: params.adminId,
      },
      { onConflict: "user_id,permission" },
    );
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "cambiar_permiso",
    targetTable: "user_permissions",
    targetId: `${params.userId}:${params.permission}`,
    targetDescription: `Permiso ${params.permission} para usuario ${params.userId} → ${params.enabled ? "activado" : "desactivado"}`,
    details: { userId: params.userId, permission: params.permission, enabled: params.enabled },
  });
}

export async function clearUserPermission(params: ClearUserPermissionParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_permissions")
    .delete()
    .eq("user_id", params.userId)
    .eq("permission", params.permission);
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "cambiar_permiso",
    targetTable: "user_permissions",
    targetId: `${params.userId}:${params.permission}`,
    targetDescription: `Permiso ${params.permission} para usuario ${params.userId} → hereda del rol`,
    details: { userId: params.userId, permission: params.permission },
  });
}

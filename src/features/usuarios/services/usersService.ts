import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { AppRole } from "@/types/auth";

interface UpdateProfileParams {
  userId: string;
  fullName: string;
}

export async function updateProfile(params: UpdateProfileParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ full_name: params.fullName.trim() })
    .eq("id", params.userId);
  if (error) throw error;
}

interface SetUserRoleParams {
  targetUserId: string;
  targetDisplayName: string;
  previousRole: AppRole | null;
  newRole: AppRole;
  adminId: string | null;
  adminName: string | null;
}

export async function setUserRole(params: SetUserRoleParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      role: params.newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.targetUserId);
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "cambiar_rol",
    targetTable: "user_profiles",
    targetId: params.targetUserId,
    targetDescription: `Rol cambiado: ${params.targetDisplayName} → ${params.newRole}`,
    details: { rol_anterior: params.previousRole, rol_nuevo: params.newRole },
  });
}

interface ToggleUserActiveParams {
  targetUserId: string;
  targetDisplayName: string;
  previousActive: boolean;
  newActive: boolean;
  adminId: string | null;
  adminName: string | null;
}

export async function toggleUserActive(params: ToggleUserActiveParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      is_active: params.newActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.targetUserId);
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "cambiar_estado_usuario",
    targetTable: "user_profiles",
    targetId: params.targetUserId,
    targetDescription: `Usuario ${params.newActive ? "activado" : "desactivado"}: ${params.targetDisplayName}`,
    details: { previous_active: params.previousActive, new_active: params.newActive },
  });
}

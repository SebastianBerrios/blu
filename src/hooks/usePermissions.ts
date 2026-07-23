import useSWR from "swr";
import { useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolvePermission } from "@/features/usuarios/services/permissionsResolver";
import type { RolePermission, UserPermission, PermissionKey } from "@/types/permissions";

const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
} as const;

const fetchRolePermissions = async (): Promise<RolePermission[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("role_permissions").select("*");
  if (error) throw error;
  return data ?? [];
};

const fetchUserPermissions = async (userId: string): Promise<UserPermission[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_permissions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
};

export function usePermissions() {
  const { user, role, isAdmin, isLoading: authLoading } = useAuth();

  const {
    data: roleData,
    error: roleErr,
    isLoading: roleLoading,
    mutate: mutateRole,
  } = useSWR("role-permissions", fetchRolePermissions, SWR_CONFIG);

  // Current user's overrides only; null key while unauthenticated (SWR skips — no waterfall).
  const {
    data: userData,
    error: userErr,
    isLoading: userLoading,
    mutate: mutateUser,
  } = useSWR(
    user ? ["user-permissions", user.id] : null,
    () => fetchUserPermissions(user!.id),
    SWR_CONFIG,
  );

  const rolePerms = useMemo(() => roleData ?? [], [roleData]);
  const userPerms = useMemo(() => userData ?? [], [userData]);

  // Derived during render, memoized on fetched arrays — no effect (vercel rerender-derived-state-no-effect).
  const can = useCallback(
    (permission: PermissionKey) =>
      resolvePermission(permission, { isAdmin, role, rolePerms, userPerms }),
    [isAdmin, role, rolePerms, userPerms],
  );

  return {
    rolePermissions: rolePerms,
    userPermissions: userPerms,
    // Keep alias so existing PermissionsTab compiles unchanged in PR1.
    // Removed in PR2 when the dashboard is rewritten.
    permissions: rolePerms,
    error: roleErr ?? userErr,
    isLoading: roleLoading || userLoading || authLoading,
    mutate: async () => {
      await Promise.all([mutateRole(), mutateUser()]);
    },
    can,
  };
}

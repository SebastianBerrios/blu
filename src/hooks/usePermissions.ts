import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RolePermission, PermissionKey } from "@/types/permissions";

const fetchRolePermissions = async (): Promise<RolePermission[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("role_permissions").select("*");
  if (error) throw error;
  return data || [];
};

export function usePermissions() {
  const { role, isAdmin, isLoading: authLoading } = useAuth();
  const { data, error, isLoading, mutate } = useSWR("role-permissions", fetchRolePermissions, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  const permissions = data ?? [];

  // can(): admin siempre puede; resto según role_permissions del rol actual.
  const can = (permission: PermissionKey): boolean => {
    if (isAdmin) return true;
    if (!role) return false;
    return permissions.some(
      (p) => p.role === role && p.permission === permission && p.enabled
    );
  };

  return {
    permissions,
    error,
    isLoading: isLoading || authLoading,
    mutate,
    can,
  };
}

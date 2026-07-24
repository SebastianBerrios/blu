"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useUsers } from "@/hooks/useUsers";
import {
  setRolePermission,
  setUserPermission,
  clearUserPermission,
  fetchUserOverrides,
} from "@/features/usuarios";
import Spinner from "@/components/ui/Spinner";
import { PERMISSION_DEFS } from "@/types/permissions";
import type { PermissionKey, UserPermission } from "@/types/permissions";
import type { AppRole } from "@/types/auth";
import { RoleMatrix, UserOverridePanel } from "./permissions";
import { deriveConfigRoles } from "./permissions/configRoles";

export default function PermissionsTab() {
  const { user, profile } = useAuth();
  const { rolePermissions, isLoading, mutate } = usePermissions();
  const { users, isLoading: usersLoading } = useUsers();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Distinct SWR namespace from usePermissions' own ["user-permissions", currentUserId]
  // fetch, so the admin-view fetch of another user's rows can never share a cache entry.
  const { data: selectedUserOverrides, mutate: mutateSelectedOverrides } = useSWR(
    selectedUserId ? ["user-permissions-admin-view", selectedUserId] : null,
    () => fetchUserOverrides(selectedUserId!),
  );
  const overridesList = useMemo(() => selectedUserOverrides ?? [], [selectedUserOverrides]);
  const configRoles = deriveConfigRoles(users);

  const isRoleEnabled = useCallback(
    (role: string, key: PermissionKey) =>
      rolePermissions.some((p) => p.role === role && p.permission === key && p.enabled),
    [rolePermissions],
  );

  const roleBaseline = useCallback(
    (userId: string, key: PermissionKey): boolean => {
      const u = users.find((x) => x.id === userId);
      if (!u?.role || u.role === "admin") return true;
      return rolePermissions.some((p) => p.role === u.role && p.permission === key && p.enabled);
    },
    [users, rolePermissions],
  );

  const userOverridesFn = useCallback(
    (userId: string): UserPermission[] => (userId === selectedUserId ? overridesList : []),
    [selectedUserId, overridesList],
  );

  // Shared pending-set helper; runs `fn`, resolves SWR caches, shows toast.
  const withPending = (cellKey: string, fn: () => Promise<void>, successMsg: string) => async () => {
    setPending((prev) => new Set(prev).add(cellKey));
    try {
      await fn();
      await Promise.all([mutate(), mutateSelectedOverrides()]);
      toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar permiso");
    } finally {
      setPending((prev) => { const c = new Set(prev); c.delete(cellKey); return c; });
    }
  };

  const handleRoleToggle = (role: string, key: PermissionKey) => {
    const next = !isRoleEnabled(role, key);
    return withPending(
      `${role}:${key}`,
      () => setRolePermission({ role: role as Exclude<AppRole, "admin">, permission: key, enabled: next, adminId: user?.id ?? null, adminName: profile?.full_name ?? null }),
      `Permiso ${next ? "activado" : "desactivado"}`,
    )();
  };

  const handleUserOverride = (userId: string, key: PermissionKey, enabled: boolean) =>
    withPending(
      `user-override:${userId}:${key}`,
      () => setUserPermission({ userId, permission: key, enabled, adminId: user?.id ?? null, adminName: profile?.full_name ?? null }),
      `Permiso individual ${enabled ? "activado" : "desactivado"}`,
    )();

  const handleUserInherit = (userId: string, key: PermissionKey) =>
    withPending(
      `user-override:${userId}:${key}`,
      () => clearUserPermission({ userId, permission: key, adminId: user?.id ?? null, adminName: profile?.full_name ?? null }),
      "Permiso restablecido al valor del rol",
    )();

  if (isLoading || usersLoading) return <Spinner text="Cargando permisos..." size="md" />;

  return (
    <div>
      <RoleMatrix defs={PERMISSION_DEFS} roles={configRoles} isEnabled={isRoleEnabled} pending={pending} onToggle={handleRoleToggle} />
      <UserOverridePanel
        users={users} defs={PERMISSION_DEFS} selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        userOverrides={userOverridesFn} roleBaseline={roleBaseline}
        pending={pending} onSet={handleUserOverride} onInherit={handleUserInherit}
      />
    </div>
  );
}

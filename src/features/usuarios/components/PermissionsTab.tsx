"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { setRolePermission } from "@/features/usuarios";
import Spinner from "@/components/ui/Spinner";
import {
  PERMISSION_DEFS,
  CONFIGURABLE_ROLES,
  type PermissionGroup,
  type PermissionKey,
} from "@/types/permissions";
import type { AppRole } from "@/types/auth";

const ROLE_LABEL: Record<string, string> = {
  cocinero: "Cocinero",
  barista: "Barista",
};

const GROUP_ORDER: PermissionGroup[] = ["Ventas", "Inventario"];

type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-primary-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function PermissionsTab() {
  const { user, profile } = useAuth();
  const { permissions, isLoading, mutate } = usePermissions();
  const [pending, setPending] = useState<Set<string>>(new Set());

  const isEnabled = (role: AppRole, permission: PermissionKey) =>
    permissions.some((p) => p.role === role && p.permission === permission && p.enabled);

  const handleToggle = async (role: ConfigurableRole, permission: PermissionKey) => {
    const cellKey = `${role}:${permission}`;
    const next = !isEnabled(role, permission);

    setPending((prev) => new Set(prev).add(cellKey));
    try {
      await setRolePermission({
        role,
        permission,
        enabled: next,
        adminId: user?.id ?? null,
        adminName: profile?.full_name ?? null,
      });
      await mutate();
      toast.success(`Permiso ${next ? "activado" : "desactivado"} para ${ROLE_LABEL[role]}`);
    } catch (err) {
      console.error("Error al cambiar permiso:", err);
      toast.error(err instanceof Error ? err.message : "Error al cambiar permiso");
    } finally {
      setPending((prev) => {
        const copy = new Set(prev);
        copy.delete(cellKey);
        return copy;
      });
    }
  };

  if (isLoading) return <Spinner text="Cargando permisos..." size="md" />;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-base md:text-lg font-semibold text-slate-900">Permisos por rol</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Activa o desactiva lo que cada rol puede hacer. El administrador siempre tiene acceso completo.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left px-4 md:px-6 py-3 font-medium text-slate-600">Permiso</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-center w-28">Administrador</th>
              {CONFIGURABLE_ROLES.map((role) => (
                <th key={role} className="px-4 py-3 font-medium text-slate-600 text-center w-28">
                  {ROLE_LABEL[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {GROUP_ORDER.map((group) => {
              const defs = PERMISSION_DEFS.filter((d) => d.group === group);
              return (
                <FragmentGroup key={group}>
                  <tr className="bg-slate-50/60">
                    <td
                      colSpan={2 + CONFIGURABLE_ROLES.length}
                      className="px-4 md:px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {group}
                    </td>
                  </tr>
                  {defs.map((def) => (
                    <tr key={def.key} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-6 py-3">
                        <p className="font-medium text-slate-900">{def.label}</p>
                        <p className="text-xs text-slate-500">{def.description}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-slate-500">Siempre</span>
                      </td>
                      {CONFIGURABLE_ROLES.map((role) => {
                        const cellKey = `${role}:${def.key}`;
                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle
                                checked={isEnabled(role, def.key)}
                                disabled={pending.has(cellKey)}
                                onChange={() => handleToggle(role, def.key)}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </FragmentGroup>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper para agrupar filas sin envoltorio DOM extra dentro de <tbody>.
function FragmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

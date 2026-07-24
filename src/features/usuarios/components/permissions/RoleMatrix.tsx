/**
 * RoleMatrix — presentational permission matrix for configurable roles.
 * Admin column always shows "Siempre" (no toggle). Roles are data-driven.
 * Presentational only: no service/createClient imports.
 */
import { Fragment } from "react";
import Toggle from "./Toggle";
import type { PermissionKey } from "@/types/permissions";
import { PERMISSION_DEFS, PERMISSION_GROUPS } from "@/types/permissions";

export const ROLE_LABEL: Record<string, string> = {
  cocinero: "Cocinero",
  barista: "Barista",
};

interface RoleMatrixProps {
  defs: typeof PERMISSION_DEFS;
  roles: string[];
  isEnabled: (role: string, key: PermissionKey) => boolean;
  pending: Set<string>;
  onToggle: (role: string, key: PermissionKey) => void;
}

export default function RoleMatrix({ defs, roles, isEnabled, pending, onToggle }: RoleMatrixProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-base md:text-lg font-semibold text-slate-900">Permisos por rol</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Activa o desactiva lo que cada rol puede hacer. El administrador siempre tiene acceso
          completo.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left px-4 md:px-6 py-3 font-medium text-slate-600">Permiso</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-center w-28">
                Administrador
              </th>
              {roles.map((role) => (
                <th key={role} className="px-4 py-3 font-medium text-slate-600 text-center w-28">
                  {ROLE_LABEL[role] ?? role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PERMISSION_GROUPS.map((group) => {
              const groupDefs = defs.filter((d) => d.group === group);
              if (groupDefs.length === 0) return null;
              return (
                <Fragment key={group}>
                  <tr className="bg-slate-50/60">
                    <td
                      colSpan={2 + roles.length}
                      className="px-4 md:px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {group}
                    </td>
                  </tr>
                  {groupDefs.map((def) => (
                    <tr key={def.key} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-6 py-3">
                        <p className="font-medium text-slate-900">{def.label}</p>
                        <p className="text-xs text-slate-500">{def.description}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-slate-500">Siempre</span>
                      </td>
                      {roles.map((role) => {
                        const cellKey = `${role}:${def.key}`;
                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle
                                checked={isEnabled(role, def.key)}
                                disabled={pending.has(cellKey)}
                                onChange={() => onToggle(role, def.key)}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

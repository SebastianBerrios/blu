/**
 * UserOverridePanel — per-user permission override sub-view.
 * Renders a user selector and a TriStateControl per permission key,
 * with a role-baseline hint ("Hereda del rol: Activado / Desactivado").
 * Presentational only: no service/createClient imports.
 */
import TriStateControl, { type TriStateValue } from "./TriStateControl";
import type { PermissionKey } from "@/types/permissions";
import { PERMISSION_DEFS, PERMISSION_GROUPS } from "@/types/permissions";
import type { UserPermission } from "@/types/permissions";
import type { UserProfile } from "@/types/auth";
import { ROLE_LABEL } from "./RoleMatrix";

interface UserOverridePanelProps {
  users: UserProfile[];
  defs: typeof PERMISSION_DEFS;
  selectedUserId: string | null;
  onSelectUser: (id: string) => void;
  userOverrides: (userId: string) => UserPermission[];
  roleBaseline: (userId: string, key: PermissionKey) => boolean;
  pending: Set<string>;
  onSet: (userId: string, key: PermissionKey, enabled: boolean) => void;
  onInherit: (userId: string, key: PermissionKey) => void;
}

function triStateValue(overrides: UserPermission[], key: PermissionKey): TriStateValue {
  const row = overrides.find((r) => r.permission === key);
  if (!row) return "inherit";
  return row.enabled ? "on" : "off";
}

export default function UserOverridePanel({
  users,
  defs,
  selectedUserId,
  onSelectUser,
  userOverrides,
  roleBaseline,
  pending,
  onSet,
  onInherit,
}: UserOverridePanelProps) {
  const nonAdminUsers = users.filter((u) => u.role !== "admin");
  const selectedUser = nonAdminUsers.find((u) => u.id === selectedUserId) ?? null;
  const overrides = selectedUserId ? userOverrides(selectedUserId) : [];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-4">
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-base md:text-lg font-semibold text-slate-900">
          Permisos individuales
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Configura excepciones por usuario. &ldquo;Hereda&rdquo; aplica el permiso del rol.
        </p>
      </div>

      <div className="px-4 md:px-6 py-4">
        <label htmlFor="user-override-select" className="block text-sm font-medium text-slate-700 mb-1">
          Usuario
        </label>
        <select
          id="user-override-select"
          value={selectedUserId ?? ""}
          onChange={(e) => onSelectUser(e.target.value)}
          className="w-full sm:w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="" disabled>
            Selecciona un usuario
          </option>
          {nonAdminUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id} — {ROLE_LABEL[u.role ?? ""] ?? u.role}
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="px-4 md:px-6 pb-4 space-y-6">
          {PERMISSION_GROUPS.map((group) => {
            const groupDefs = defs.filter((d) => d.group === group);
            if (groupDefs.length === 0) return null;
            return (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  {group}
                </p>
                <div className="space-y-4">
                  {groupDefs.map((def) => {
                    const key = def.key;
                    const cellKey = `user-override:${selectedUser.id}:${key}`;
                    const currentValue = triStateValue(overrides, key);
                    const baseline = roleBaseline(selectedUser.id, key);

                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{def.label}</p>
                          <p className="text-xs text-slate-500">{def.description}</p>
                          {currentValue === "inherit" && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              Hereda del rol:{" "}
                              <span
                                className={
                                  baseline ? "text-green-600 font-medium" : "text-slate-500"
                                }
                              >
                                {baseline ? "Activado" : "Desactivado"}
                              </span>
                            </p>
                          )}
                        </div>
                        <TriStateControl
                          value={currentValue}
                          disabled={pending.has(cellKey)}
                          onChange={(next) => {
                            if (next === "inherit") {
                              onInherit(selectedUser.id, key);
                            } else {
                              onSet(selectedUser.id, key, next === "on");
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!selectedUser && (
        <div className="px-4 md:px-6 pb-6 text-center text-sm text-slate-400">
          Selecciona un usuario para ver y editar sus permisos individuales.
        </div>
      )}
    </div>
  );
}

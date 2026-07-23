import type { Tables } from "./database";
import type { AppRole } from "./auth";

export type RolePermission = Tables<"role_permissions">;
export type UserPermission = Tables<"user_permissions">;

export type PermissionGroup = "Ventas" | "Inventario" | "Compras";

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  group: PermissionGroup;
}

// Fuente única de labels/orden/grupos para el dashboard de permisos.
// Declared as const + satisfies so PermissionKey is derived from literals below.
export const PERMISSION_DEFS = [
  {
    key: "sales.edit_any_date",
    label: "Editar ventas de cualquier fecha",
    description: "Sin este permiso solo puede editar las ventas del día.",
    group: "Ventas",
  },
  {
    key: "sales.delete",
    label: "Eliminar ventas",
    description: "Permite borrar ventas y revertir sus transacciones.",
    group: "Ventas",
  },
  {
    key: "inventory.adjust_stock",
    label: "Ajustar stock",
    description: "Permite corregir manualmente la cantidad en inventario.",
    group: "Inventario",
  },
  {
    key: "inventory.discard",
    label: "Descartar (merma)",
    description: "Permite registrar mermas y descontar stock.",
    group: "Inventario",
  },
  {
    key: "inventory.produce",
    label: "Producir lotes",
    description: "Permite producir lotes de intermedios y deshacer producciones.",
    group: "Inventario",
  },
  {
    key: "inventory.view_history",
    label: "Ver historial de movimientos",
    description: "Permite ver la pestaña de historial de inventario.",
    group: "Inventario",
  },
  {
    key: "purchases.delete",
    label: "Eliminar compras",
    description: "Permite borrar compras y revertir sus transacciones.",
    group: "Compras",
  },
] as const satisfies readonly PermissionDef[];

// Derived from PERMISSION_DEFS — adding/removing an entry auto-updates this type.
export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"];

export interface PermissionResolutionCtx {
  isAdmin: boolean;
  role: AppRole | null;
  rolePerms: RolePermission[];
  userPerms: UserPermission[];
}

// Roles configurables en el dashboard (admin siempre tiene todo).
export const CONFIGURABLE_ROLES: Exclude<AppRole, "admin">[] = ["cocinero", "barista"];

import type { Tables } from "./database";
import type { AppRole } from "./auth";

export type RolePermission = Tables<"role_permissions">;

export type PermissionKey =
  | "sales.edit_any_date"
  | "sales.delete"
  | "inventory.adjust_stock"
  | "inventory.discard"
  | "inventory.produce"
  | "inventory.view_history";

export type PermissionGroup = "Ventas" | "Inventario";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
  group: PermissionGroup;
}

// Fuente única de labels/orden/grupos para el dashboard de permisos.
export const PERMISSION_DEFS: PermissionDef[] = [
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
];

// Roles configurables en el dashboard (admin siempre tiene todo).
export const CONFIGURABLE_ROLES: Exclude<AppRole, "admin">[] = ["cocinero", "barista"];

import type { Tables } from "./database";
import type { AppRole } from "./auth";

export type RolePermission = Tables<"role_permissions">;
export type UserPermission = Tables<"user_permissions">;

export type PermissionGroup = "Ventas" | "Inventario" | "Compras" | "Módulos";

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  group: PermissionGroup;
  level: "module" | "action" | "field";
}

// Fuente única de labels/orden/grupos para el dashboard de permisos.
// Declared as const + satisfies so PermissionKey is derived from literals below.
export const PERMISSION_DEFS = [
  {
    key: "sales.edit_any_date",
    label: "Editar ventas de cualquier fecha",
    description: "Sin este permiso solo puede editar las ventas del día.",
    group: "Ventas",
    level: "action",
  },
  {
    key: "sales.delete",
    label: "Eliminar ventas",
    description: "Permite borrar ventas y revertir sus transacciones.",
    group: "Ventas",
    level: "action",
  },
  {
    key: "inventory.adjust_stock",
    label: "Ajustar stock",
    description: "Permite corregir manualmente la cantidad en inventario.",
    group: "Inventario",
    level: "action",
  },
  {
    key: "inventory.discard",
    label: "Descartar (merma)",
    description: "Permite registrar mermas y descontar stock.",
    group: "Inventario",
    level: "action",
  },
  {
    key: "inventory.produce",
    label: "Producir lotes",
    description: "Permite producir lotes de intermedios y deshacer producciones.",
    group: "Inventario",
    level: "action",
  },
  {
    key: "inventory.view_history",
    label: "Ver historial de movimientos",
    description: "Permite ver la pestaña de historial de inventario.",
    group: "Inventario",
    level: "action",
  },
  {
    key: "purchases.delete",
    label: "Eliminar compras",
    description: "Permite borrar compras y revertir sus transacciones.",
    group: "Compras",
    level: "action",
  },
  // Module-access keys — drive nav visibility and page guards (Fase 2).
  // Do NOT add module.finanzas / module.estadisticas / module.auditoria / module.users:
  // those paths are permanently admin-only (hardcoded, not configurable).
  {
    key: "module.categories",
    label: "Ver Categorías",
    description: "Permite abrir el módulo de Categorías.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.products",
    label: "Ver Productos",
    description: "Permite abrir el módulo de Productos.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.ingredients",
    label: "Ver Ingredientes",
    description: "Permite abrir el módulo de Ingredientes.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.recipes",
    label: "Ver Recetas",
    description: "Permite abrir el módulo de Recetas.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.sales",
    label: "Ver Ventas",
    description: "Permite abrir el módulo de Ventas.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.pedidos",
    label: "Ver Pedidos",
    description: "Permite abrir el módulo de Pedidos.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.compras",
    label: "Ver Compras",
    description: "Permite abrir el módulo de Compras.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.inventario",
    label: "Ver Inventario",
    description: "Permite abrir el módulo de Inventario.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.horario",
    label: "Ver Horario",
    description: "Permite abrir el módulo de Horario.",
    group: "Módulos",
    level: "module",
  },
  {
    key: "module.actividades",
    label: "Ver Actividades",
    description: "Permite abrir el módulo de Actividades.",
    group: "Módulos",
    level: "module",
  },
] as const satisfies readonly PermissionDef[];

// Derived from PERMISSION_DEFS — adding/removing an entry auto-updates this type.
export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"];

// Order-preserving unique groups derived from PERMISSION_DEFS (single source of
// truth). Adding a new group to a def surfaces it in the dashboard automatically.
export const PERMISSION_GROUPS: PermissionGroup[] = [
  ...new Set(PERMISSION_DEFS.map((d) => d.group)),
];

export interface PermissionResolutionCtx {
  isAdmin: boolean;
  role: AppRole | null;
  rolePerms: RolePermission[];
  userPerms: UserPermission[];
}

// Roles configurables en el dashboard (admin siempre tiene todo).
export const CONFIGURABLE_ROLES: Exclude<AppRole, "admin">[] = ["cocinero", "barista"];

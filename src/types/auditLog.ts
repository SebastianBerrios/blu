import type { Tables } from "./database";

export type AuditLog = Tables<"audit_logs">;

export type AuditAction =
  | "eliminar"
  | "crear_venta"
  | "crear_transaccion"
  | "cambiar_estado_pedido"
  | "cambiar_rol"
  | "cambiar_estado_usuario"
  | "configurar_saldo"
  | "ajustar_inventario"
  | "editar_ingredientes_receta"
  | "crear_receta_producto"
  | "crear"
  | "actualizar"
  | "aprobar_permiso"
  | "rechazar_permiso"
  | "registrar_horas_extra";

export type AuditTargetTable =
  | "categories"
  | "products"
  | "ingredients"
  | "recipes"
  | "sales"
  | "purchases"
  | "transactions"
  | "sale_products"
  | "user_profiles"
  | "accounts"
  | "inventory_movements"
  | "schedule_templates"
  | "schedule_overrides"
  | "time_off_requests"
  | "extra_hours_log";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  eliminar: "Eliminación",
  crear_venta: "Creación de venta",
  crear_transaccion: "Transacción",
  cambiar_estado_pedido: "Estado de pedido",
  cambiar_rol: "Cambio de rol",
  cambiar_estado_usuario: "Estado de usuario",
  configurar_saldo: "Configuración de saldo",
  ajustar_inventario: "Ajuste de inventario",
  editar_ingredientes_receta: "Edición de ingredientes de receta",
  crear_receta_producto: "Creación de receta para producto",
  crear: "Creación",
  actualizar: "Actualización",
  aprobar_permiso: "Aprobación de permiso",
  rechazar_permiso: "Rechazo de permiso",
  registrar_horas_extra: "Registro de horas extra",
};

export const AUDIT_TABLE_LABELS: Record<AuditTargetTable, string> = {
  categories: "Categorías",
  products: "Productos",
  ingredients: "Ingredientes",
  recipes: "Recetas",
  sales: "Ventas",
  purchases: "Compras",
  transactions: "Transacciones",
  sale_products: "Productos de venta",
  user_profiles: "Usuarios",
  accounts: "Cuentas",
  inventory_movements: "Inventario",
  schedule_templates: "Horarios",
  schedule_overrides: "Excepciones de horario",
  time_off_requests: "Solicitudes de permiso",
  extra_hours_log: "Horas extra",
};

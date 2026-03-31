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
  | "crear_receta_producto";

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
  | "inventory_movements";

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
};

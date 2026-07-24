/**
 * Pure nav resolver — no React, no hooks, fully unit-testable.
 *
 * NAV_MODULE_KEY maps each configurable module path to its module.* PermissionKey.
 * The 4 sensitive admin-only paths (finanzas/estadisticas/auditoria/users) have
 * NO entry here — they are gated by item.adminOnly, which is non-delegatable.
 *
 * isNavItemVisible is imported by both SideBar and BottomNav to replace the
 * legacy `!item.adminOnly || isAdmin` filter with a single, testable call.
 */
import type { PermissionKey } from "@/types/permissions";

export const NAV_MODULE_KEY: Record<string, PermissionKey> = {
  "/categories": "module.categories",
  "/products": "module.products",
  "/ingredients": "module.ingredients",
  "/recipes": "module.recipes",
  "/sales": "module.sales",
  "/pedidos": "module.pedidos",
  "/compras": "module.compras",
  "/inventario": "module.inventario",
  "/horario": "module.horario",
  "/actividades": "module.actividades",
};

export interface NavItemCtx {
  isAdmin: boolean;
  can: (key: PermissionKey) => boolean;
}

export interface NavItemShape {
  /** The path used for routing. SideBar uses `nav`; BottomNav callers pass `item.href` as `nav`. */
  nav: string;
  adminOnly?: boolean;
}

/**
 * Decides whether a nav item should be rendered for the current user.
 *
 * Rules (in priority order):
 * 1. If item.adminOnly is true → show only for admin (never delegatable).
 * 2. If the path has a module.* key → delegate to can(key) (admins always get true via branch-1 in resolvePermission).
 * 3. Otherwise (unmapped path) → always visible.
 *
 * BottomNav note: BottomNav items use `href` as their path field. Callers should
 * pass `{ nav: item.href, adminOnly: item.adminOnly }` when calling this function.
 */
export function isNavItemVisible(item: NavItemShape, ctx: NavItemCtx): boolean {
  if (item.adminOnly) return ctx.isAdmin;
  // Admins always see all nav items (branch-1 invariant — mirrors resolvePermission).
  if (ctx.isAdmin) return true;
  const key = NAV_MODULE_KEY[item.nav];
  return key ? ctx.can(key) : true;
}

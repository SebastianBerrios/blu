/**
 * Single source of truth for navigation items.
 *
 * Both SideBar (desktop) and BottomNav (mobile) consume this config instead of
 * their own inline arrays, so label / href / icon / adminOnly can never drift
 * between the two bars.
 *
 * Shape notes:
 * - `href` is the routing path AND the key used by `isNavItemVisible` (the
 *   resolver reads `item.nav`; consumers pass `{ nav: item.href }`).
 * - `icon` keeps the lucide component reference (not a string) so callers render
 *   `<item.icon />` directly.
 * - `adminOnly` mirrors the legacy per-item flag consumed by `isNavItemVisible`.
 *
 * Layout responsibilities are intentionally split, because the two bars legitimately
 * differ (BottomNav shows role-dependent primary tabs + a "Más" sheet, SideBar shows
 * one flat ordered list):
 * - SIDEBAR_ITEMS          → SideBar's ordered list.
 * - BOTTOM_NAV_ADMIN_TABS  → BottomNav primary tabs for admins.
 * - BOTTOM_NAV_COMMON_TABS → BottomNav primary tabs for non-admins.
 * - BOTTOM_NAV_MORE_ITEMS  → BottomNav "Más" sheet candidates.
 *
 * All four lists reference the SAME canonical NAV_ITEMS entries, so metadata is
 * defined exactly once.
 */
import {
  FolderOpen,
  ShoppingBasket,
  ChefHat,
  BookOpen,
  TrendingUp,
  ClipboardList,
  ShoppingCart,
  Package,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  BarChart3,
  ScrollText,
  Users,
} from "lucide-react";

export interface NavItem {
  /** Routing path. Also the key read by `isNavItemVisible` (passed as `nav`). */
  href: string;
  /** Visible Spanish label. */
  label: string;
  /** Lucide icon component reference. */
  icon: typeof FolderOpen;
  /** Admin-only, non-delegatable gate (mirrors `isNavItemVisible` input). */
  adminOnly?: boolean;
}

/**
 * Canonical registry, keyed by path. Metadata lives here once. Layout lists below
 * reference these entries so labels / icons / adminOnly stay in lockstep.
 */
export const NAV_ITEMS = {
  categories: { href: "/categories", label: "Categorías", icon: FolderOpen },
  products: { href: "/products", label: "Productos", icon: ShoppingBasket },
  ingredients: { href: "/ingredients", label: "Ingredientes", icon: ChefHat, adminOnly: true },
  recipes: { href: "/recipes", label: "Recetas", icon: BookOpen, adminOnly: true },
  sales: { href: "/sales", label: "Ventas", icon: TrendingUp },
  pedidos: { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  compras: { href: "/compras", label: "Compras", icon: ShoppingCart },
  inventario: { href: "/inventario", label: "Inventario", icon: Package },
  horario: { href: "/horario", label: "Horario", icon: CalendarDays },
  actividades: { href: "/actividades", label: "Actividades", icon: ClipboardCheck },
  finanzas: { href: "/finanzas", label: "Finanzas", icon: Wallet, adminOnly: true },
  estadisticas: { href: "/estadisticas", label: "Estadísticas", icon: BarChart3, adminOnly: true },
  auditoria: { href: "/auditoria", label: "Auditoría", icon: ScrollText, adminOnly: true },
  users: { href: "/users", label: "Usuarios", icon: Users, adminOnly: true },
} as const satisfies Record<string, NavItem>;

/**
 * SideBar order (desktop). Matches the legacy `allNavItems` array order exactly.
 */
export const SIDEBAR_ITEMS: readonly NavItem[] = [
  NAV_ITEMS.categories,
  NAV_ITEMS.products,
  NAV_ITEMS.ingredients,
  NAV_ITEMS.recipes,
  NAV_ITEMS.sales,
  NAV_ITEMS.pedidos,
  NAV_ITEMS.compras,
  NAV_ITEMS.inventario,
  NAV_ITEMS.horario,
  NAV_ITEMS.actividades,
  NAV_ITEMS.finanzas,
  NAV_ITEMS.estadisticas,
  NAV_ITEMS.auditoria,
  NAV_ITEMS.users,
];

/**
 * BottomNav primary tabs for admins. Matches the legacy `ADMIN_TABS` order.
 */
export const BOTTOM_NAV_ADMIN_TABS: readonly NavItem[] = [
  NAV_ITEMS.sales,
  NAV_ITEMS.pedidos,
  NAV_ITEMS.finanzas,
  NAV_ITEMS.products,
];

/**
 * BottomNav primary tabs for non-admins. Matches the legacy `COMMON_TABS` order.
 */
export const BOTTOM_NAV_COMMON_TABS: readonly NavItem[] = [
  NAV_ITEMS.sales,
  NAV_ITEMS.pedidos,
  NAV_ITEMS.compras,
];

/**
 * BottomNav "Más" sheet candidates. Matches the legacy `MORE_ITEMS` order.
 *
 * Note: `/compras` and `/products` appear here WITHOUT adminOnly (they are
 * canonically non-admin) — preserved exactly from the legacy list.
 */
export const BOTTOM_NAV_MORE_ITEMS: readonly NavItem[] = [
  NAV_ITEMS.categories,
  NAV_ITEMS.ingredients,
  NAV_ITEMS.recipes,
  NAV_ITEMS.compras,
  NAV_ITEMS.products,
  NAV_ITEMS.inventario,
  NAV_ITEMS.horario,
  NAV_ITEMS.actividades,
  NAV_ITEMS.finanzas,
  NAV_ITEMS.estadisticas,
  NAV_ITEMS.auditoria,
  NAV_ITEMS.users,
];

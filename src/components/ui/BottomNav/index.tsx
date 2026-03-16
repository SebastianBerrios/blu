"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  ClipboardList,
  ShoppingBasket,
  Wallet,
  MoreHorizontal,
  FolderOpen,
  ChefHat,
  BookOpen,
  ShoppingCart,
  BarChart3,
  Users,
  ScrollText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import BottomSheet from "@/components/ui/BottomSheet";

interface NavTab {
  href: string;
  label: string;
  icon: typeof TrendingUp;
}

const COMMON_TABS: NavTab[] = [
  { href: "/sales", label: "Ventas", icon: TrendingUp },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/products", label: "Productos", icon: ShoppingBasket },
];

const ADMIN_TABS: NavTab[] = [
  { href: "/sales", label: "Ventas", icon: TrendingUp },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/products", label: "Productos", icon: ShoppingBasket },
];

interface MoreItem {
  href: string;
  label: string;
  icon: typeof TrendingUp;
  adminOnly?: boolean;
}

const MORE_ITEMS: MoreItem[] = [
  { href: "/categories", label: "Categorías", icon: FolderOpen },
  { href: "/ingredients", label: "Ingredientes", icon: ChefHat, adminOnly: true },
  { href: "/recipes", label: "Recetas", icon: BookOpen, adminOnly: true },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3, adminOnly: true },
  { href: "/auditoria", label: "Auditoría", icon: ScrollText, adminOnly: true },
  { href: "/users", label: "Usuarios", icon: Users, adminOnly: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const tabs = isAdmin ? ADMIN_TABS : COMMON_TABS;

  // Filter "Más" items: exclude items already in tabs, filter by role
  const tabHrefs = new Set(tabs.map((t) => t.href));
  const moreItems = MORE_ITEMS.filter(
    (item) => !tabHrefs.has(item.href) && (!item.adminOnly || isAdmin)
  );

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <div
          className="flex items-stretch justify-around"
          style={{ height: "64px", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] gap-0.5 transition-colors ${
                  isActive ? "text-primary-600" : "text-slate-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] gap-0.5 transition-colors ${
              isMoreActive ? "text-primary-600" : "text-slate-400"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">Más</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <BottomSheet isOpen={showMore} onClose={() => setShowMore(false)}>
        <h3 className="text-lg font-semibold text-slate-900 mb-3 px-1">Más opciones</h3>
        <div className="grid grid-cols-3 gap-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl min-h-[44px] transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}

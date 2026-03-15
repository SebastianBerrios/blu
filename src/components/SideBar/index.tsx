"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Coffee,
  FolderOpen,
  ChefHat,
  BookOpen,
  TrendingUp,
  Menu,
  X,
  ShoppingBasket,
  ShoppingCart,
  Users,
  LogOut,
  SquarePen,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProfileForm from "@/components/forms/ProfileForm";

type NavItem = {
  id: number;
  nav: string;
  name: string;
  icon: typeof Coffee;
  adminOnly?: boolean;
};

const allNavItems: NavItem[] = [
  { id: 1, nav: "/categories", name: "Categorias", icon: FolderOpen },
  { id: 2, nav: "/products", name: "Productos", icon: ShoppingBasket },
  { id: 3, nav: "/ingredients", name: "Ingredientes", icon: ChefHat, adminOnly: true },
  { id: 4, nav: "/recipes", name: "Recetas", icon: BookOpen, adminOnly: true },
  { id: 5, nav: "/sales", name: "Ventas", icon: TrendingUp },
  { id: 8, nav: "/pedidos", name: "Pedidos", icon: ClipboardList },
  { id: 6, nav: "/compras", name: "Compras", icon: ShoppingCart },
  { id: 7, nav: "/users", name: "Usuarios", icon: Users, adminOnly: true },
];

export default function SideBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { profile, isAdmin, signOut, mutate } = useAuth();

  const navItems = allNavItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <>
      {/* Mobile header with button and title */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-primary-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 bg-primary-500 text-white rounded-lg shadow-lg hover:bg-primary-600 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-primary-900 text-lg font-bold">Blu Café</h1>
              <p className="text-primary-500 text-xs">Gestión de Negocio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-transparent bg-opacity-100 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 h-full bg-linear-to-b from-primary-50 to-white border-r border-primary-200 shadow-lg
          fixed md:static
          transform transition-transform duration-300 ease-in-out z-50
          flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-6 flex items-center gap-3 border-b border-primary-200 bg-white">
          <div className="p-2 bg-primary-500 rounded-lg">
            <Coffee size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-primary-900 text-xl font-bold">Blu Café</h1>
            <p className="text-primary-500 text-sm">Gestión de Negocio</p>
          </div>
        </div>

        <div className="p-4 flex-1">
          <h2 className="text-primary-700 font-semibold text-sm uppercase tracking-wider mb-4 px-2">
            Navegación
          </h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.nav}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-primary-700 rounded-lg transition-all duration-200 hover:bg-primary-100 hover:text-primary-900 hover:shadow-sm group"
                >
                  <IconComponent
                    size={18}
                    className="text-primary-500 group-hover:text-primary-700 transition-colors"
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User section */}
        <div className="p-4 border-t border-primary-200 bg-white">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 px-2 mb-3 w-full rounded-lg hover:bg-primary-50 py-1.5 transition-colors group"
            title="Editar perfil"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {profile?.full_name?.charAt(0)?.toUpperCase() ||
                profile?.email?.charAt(0)?.toUpperCase() ||
                "?"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-primary-900 truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-xs text-primary-500 capitalize">
                {profile?.role ?? "Sin rol"}
              </p>
            </div>
            <SquarePen size={14} className="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-primary-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {profile && (
        <ProfileForm
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onSuccess={() => mutate()}
          profile={profile}
        />
      )}
    </>
  );
}

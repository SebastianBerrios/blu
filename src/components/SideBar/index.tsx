"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Coffee, LogOut, SquarePen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { isNavItemVisible } from "@/features/usuarios/permissions/moduleNav";
import { SIDEBAR_ITEMS } from "@/config/navigation";
import ProfileForm from "@/components/forms/ProfileForm";

export default function SideBar() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { profile, isAdmin, signOut, mutate } = useAuth();
  const { can } = usePermissions();
  const pathname = usePathname();

  const navItems = SIDEBAR_ITEMS.filter((item) =>
    isNavItemVisible({ nav: item.href, adminOnly: item.adminOnly }, { isAdmin, can }),
  );

  return (
    <>
      <aside className="hidden md:flex md:flex-col w-64 h-full bg-white border-r border-slate-200 shadow-sm">
        {/* Logo */}
        <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-200">
          <div className="p-2 bg-primary-500 rounded-lg">
            <Coffee size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 text-xl font-bold">Blu Café</h1>
            <p className="text-slate-500 text-sm">Gestión de Negocio</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-4 px-2">
            Navegación
          </h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-primary-50 text-primary-700 border-l-3 border-primary-500 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <IconComponent
                    size={18}
                    className={isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600"}
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User section */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 px-2 mb-3 w-full rounded-lg hover:bg-slate-100 py-1.5 transition-colors group"
            title="Editar perfil"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {profile?.full_name?.charAt(0)?.toUpperCase() ||
                profile?.email?.charAt(0)?.toUpperCase() ||
                "?"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {profile?.role ?? "Sin rol"}
              </p>
            </div>
            <SquarePen size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
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

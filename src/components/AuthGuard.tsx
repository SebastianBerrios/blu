"use client";

import { useAuth } from "@/hooks/useAuth";
import Spinner from "@/components/ui/Spinner";
import { Coffee, Clock, ShieldX, LogOut } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isPending, isInactive, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-primary-50">
        <Spinner text="Cargando..." size="lg" />
      </div>
    );
  }

  if (!user) return null;

  if (isInactive) {
    return (
      <div className="h-dvh flex items-center justify-center bg-primary-50 p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-2xl mb-4">
            <ShieldX size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900 mb-2">
            Cuenta desactivada
          </h1>
          <p className="text-primary-700 mb-6">
            Tu cuenta ha sido desactivada por el administrador. Contacta al
            administrador si crees que esto es un error.
          </p>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="h-dvh flex items-center justify-center bg-primary-50 p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center p-4 bg-primary-100 rounded-2xl mb-4">
            <Clock size={40} className="text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900 mb-2">
            Esperando aprobación
          </h1>
          <p className="text-primary-700 mb-6">
            Tu cuenta está pendiente de aprobación. Un administrador te asignará
            un rol pronto.
          </p>
          <div className="flex items-center justify-center gap-2 text-primary-500 mb-6">
            <Coffee size={20} />
            <span className="text-sm">Mientras tanto, tómate un café</span>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

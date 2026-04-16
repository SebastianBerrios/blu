"use client";

import { useState } from "react";
import { Users, SquarePen, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { toggleUserActive } from "@/features/usuarios";
import type { UserProfile } from "@/types/auth";
import UserRoleForm from "@/components/forms/UserRoleForm";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";
import { formatDateMedium } from "@/utils/helpers/dateFormatters";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  barista: "bg-blue-100 text-blue-700",
  cocinero: "bg-green-100 text-green-700",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  barista: "Barista",
  cocinero: "Cocinero",
};

export default function UsersPage() {
  const { isAdmin, isLoading: authLoading, user: currentUser, profile: currentProfile } = useAuth();
  const { users, error, isLoading, mutate } = useUsers();
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | undefined>();

  if (!authLoading && !isAdmin) {
    redirect("/");
  }

  const handleAssignRole = (user: UserProfile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (targetUser: UserProfile) => {
    const newActive = !targetUser.is_active;
    const action = newActive ? "activar" : "desactivar";
    const displayName = targetUser.full_name || targetUser.email;

    const ok = await confirm({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
      description: `¿Estás seguro de ${action} a ${displayName}?`,
      confirmLabel: newActive ? "Activar" : "Desactivar",
      variant: newActive ? "primary" : "danger",
    });
    if (!ok) return;

    try {
      await toggleUserActive({
        targetUserId: targetUser.id,
        targetDisplayName: displayName,
        previousActive: !!targetUser.is_active,
        newActive,
        adminId: currentUser?.id ?? null,
        adminName: currentProfile?.full_name ?? null,
      });
      toast.success(newActive ? "Usuario activado" : "Usuario desactivado");
      mutate();
    } catch (err) {
      console.error("Error al cambiar estado del usuario:", err);
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(undefined);
  };

  const handleSuccess = () => {
    mutate();
  };


  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Usuarios"
          subtitle="Gestiona los usuarios y asigna roles"
          icon={<Users className="w-6 h-6 text-primary-700" />}
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">Error al cargar los usuarios: {error.message}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">Lista de Usuarios</h3>
                <span className="text-sm text-slate-500">
                  {isLoading ? "Cargando..." : `${users.length} registros`}
                </span>
              </div>
            </div>

            {isLoading && <Spinner text="Cargando usuarios..." size="md" />}

            {/* Mobile card view */}
            {!isLoading && users.length > 0 && (
              <div className="md:hidden divide-y divide-slate-100">
                {users.map((user) => (
                  <div key={user.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {user.role ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role]}`}>
                              {ROLE_LABEL[user.role]}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                              Pendiente
                            </span>
                          )}
                          {user.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              Activo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => handleAssignRole(user)}
                          className="p-3 text-primary-700 hover:bg-primary-50 rounded-lg"
                          title="Asignar rol"
                        >
                          <SquarePen className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-3 rounded-lg ${
                            user.is_active
                              ? "text-red-700 hover:bg-red-50"
                              : "text-green-700 hover:bg-green-50"
                          }`}
                          title={user.is_active ? "Desactivar" : "Activar"}
                        >
                          {user.is_active ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Desktop table */}
            {!isLoading && users.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Email", "Nombre", "Rol", "Estado", "Registro", "Acciones"].map((col) => (
                        <th key={col} className="px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider text-center">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-900 text-center">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 text-center">{user.full_name || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          {user.role ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role]}`}>
                              {ROLE_LABEL[user.role]}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Pendiente</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user.is_active ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Activo</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Inactivo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 text-center">{formatDateMedium(user.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAssignRole(user)}
                              className="p-3 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                              title="Asignar rol"
                            >
                              <SquarePen className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-3 rounded-lg transition-colors ${
                                user.is_active ? "text-red-700 hover:bg-red-100" : "text-green-700 hover:bg-green-100"
                              }`}
                              title={user.is_active ? "Desactivar" : "Activar"}
                            >
                              {user.is_active ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && users.length === 0 && (
              <div className="text-center py-12 px-6">
                <h3 className="text-lg font-medium text-slate-700 mb-2">No hay usuarios</h3>
                <p className="text-slate-500">No se encontraron usuarios registrados</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <UserRoleForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        user={selectedUser}
      />
    </>
  );
}

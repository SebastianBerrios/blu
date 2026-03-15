"use client";

import { useState } from "react";
import { Users, SquarePen, UserCheck, UserX } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import type { UserProfile } from "@/types/auth";
import UserRoleForm from "@/components/forms/UserRoleForm";
import Spinner from "@/components/ui/Spinner";
import { redirect } from "next/navigation";

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
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { users, error, isLoading, mutate } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | undefined>();

  if (!authLoading && !isAdmin) {
    redirect("/");
  }

  const handleAssignRole = (user: UserProfile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (user: UserProfile) => {
    const newStatus = !user.is_active;
    const action = newStatus ? "activar" : "desactivar";
    if (!confirm(`¿Estás seguro de ${action} a ${user.full_name || user.email}?`))
      return;

    const supabase = createClient();
    await supabase
      .from("user_profiles")
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(undefined);
  };

  const handleSuccess = () => {
    mutate();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <section className="h-full flex flex-col bg-primary-50">
        <header className="bg-white border-b border-primary-200 px-6 py-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Users className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-900">Usuarios</h1>
              <p className="text-primary-700 mt-1">
                Gestiona los usuarios y asigna roles
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los usuarios: {error.message}
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-primary-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-primary-200 bg-primary-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-900">
                  Lista de Usuarios
                </h3>
                <span className="text-sm text-primary-700">
                  {isLoading
                    ? "Cargando..."
                    : `${users.length} registros`}
                </span>
              </div>
            </div>

            {isLoading && (
              <div className="py-12">
                <Spinner text="Cargando usuarios..." size="md" />
              </div>
            )}

            {!isLoading && users.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-50">
                    <tr>
                      {["Email", "Nombre", "Rol", "Estado", "Registro", "Acciones"].map(
                        (col) => (
                          <th
                            key={col}
                            className="px-6 py-3 text-xs font-medium text-primary-700 uppercase tracking-wider text-center"
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-primary-200">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-primary-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-primary-900 text-center">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-900 text-center">
                          {user.full_name || "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user.role ? (
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role]}`}
                            >
                              {ROLE_LABEL[user.role]}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user.is_active ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              Activo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-700 text-center">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAssignRole(user)}
                              className="p-2 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                              title="Asignar rol"
                            >
                              <SquarePen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.is_active
                                  ? "text-red-700 hover:bg-red-100"
                                  : "text-green-700 hover:bg-green-100"
                              }`}
                              title={
                                user.is_active ? "Desactivar" : "Activar"
                              }
                            >
                              {user.is_active ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
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
                <h3 className="text-lg font-medium text-primary-900 mb-2">
                  No hay usuarios
                </h3>
                <p className="text-primary-700">
                  No se encontraron usuarios registrados
                </p>
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

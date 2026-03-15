import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { UserProfile, AppRole } from "@/types/auth";

interface UserRoleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: UserProfile;
}

interface FormData {
  role: AppRole;
}

export default function UserRoleForm({
  isOpen,
  onClose,
  onSuccess,
  user,
}: UserRoleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<FormData>();

  useEffect(() => {
    if (isOpen && user) {
      reset({
        role: user.role ?? ("barista" as AppRole),
      });
    }
  }, [isOpen, user, reset]);

  if (!isOpen || !user) return null;

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("user_profiles")
        .update({
          role: data.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al asignar rol:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900">
            Asignar Rol
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 pt-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">Usuario</p>
            <p className="font-medium text-slate-900">
              {user.full_name || "Sin nombre"}
            </p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Rol <span className="text-red-600">*</span>
            </label>
            <select
              {...register("role", { required: true })}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              <option value="barista">Barista</option>
              <option value="cocinero">Cocinero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Asignar Rol"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

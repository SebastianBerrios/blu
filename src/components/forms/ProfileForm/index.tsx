import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { UserProfile } from "@/types/auth";

interface ProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile: UserProfile;
}

interface ProfileFormData {
  full_name: string;
}

export default function ProfileForm({
  isOpen,
  onClose,
  onSuccess,
  profile,
}: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<ProfileFormData>();

  useEffect(() => {
    if (isOpen) {
      reset({
        full_name: profile.full_name ?? "",
      });
    }
  }, [isOpen, profile, reset]);

  if (!isOpen) return null;

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("user_profiles")
        .update({ full_name: data.full_name.trim() })
        .eq("id", profile.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      setSubmitError(error instanceof Error ? error.message : "Error al actualizar perfil");
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
            Editar Perfil
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

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Nombre completo <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register("full_name", {
                required: "El nombre es requerido",
                maxLength: { value: 100, message: "Máximo 100 caracteres" },
              })}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Botones */}
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
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

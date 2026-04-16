"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { createGroup, updateGroup } from "../services/inventoryService";
import type { IngredientGroup } from "@/types";

interface FormData {
  name: string;
}

interface IngredientGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: IngredientGroup;
}

export default function IngredientGroupForm({
  isOpen,
  onClose,
  onSuccess,
  group,
}: IngredientGroupFormProps) {
  const isEditMode = !!group;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (isOpen) {
      reset({ name: group?.name ?? "" });
      setSubmitError(null);
    }
  }, [isOpen, group, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateGroup(group.id, data.name.trim());
      } else {
        await createGroup(data.name.trim());
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al guardar grupo");
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditMode ? "Editar Grupo" : "Nuevo Grupo"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Nombre del grupo <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register("name", {
                required: "El nombre es requerido",
                maxLength: { value: 50, message: "Máximo 50 caracteres" },
              })}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Supermercado"
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
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
              {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { CreateCategory, Category } from "@/types";

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category?: Category;
}

export default function CategoryForm({
  isOpen,
  onClose,
  onSuccess,
  category,
}: CategoryFormProps) {
  const isEditMode = !!category;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<CreateCategory>();

  useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          name: category.name,
        });
      } else {
        reset({
          name: "",
        });
      }
    }
  }, [isOpen, category, reset]);

  if (!isOpen) return null;

  const onSubmit: SubmitHandler<CreateCategory> = async (data) => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const categoryData = {
        name: data.name.toLowerCase(),
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", category.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert(categoryData);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar categoria:", error);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-200 bg-primary-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-primary-900">
            {isEditMode ? "Editar Categoria" : "Agregar Categoria"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-primary-700" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">
              Nombre de la categoria <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register("name", {
                required: "El nombre es requerido",
                maxLength: { value: 50, message: "Máximo 50 caracteres" },
              })}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Cafes"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border-2 border-primary-300 text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditMode
                ? "Actualizar"
                : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

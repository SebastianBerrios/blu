import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { CreateIngredient, Ingredient } from "@/types";

interface IngredientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ingredient?: Ingredient;
}

export default function IngredientForm({
  isOpen,
  onClose,
  onSuccess,
  ingredient,
}: IngredientFormProps) {
  const isEditMode = !!ingredient;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<CreateIngredient>();

  useEffect(() => {
    if (isOpen) {
      if (ingredient) {
        reset({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit_of_measure: ingredient.unit_of_measure,
          price: ingredient.price,
        });
      } else {
        reset({
          name: "",
          quantity: 0,
          unit_of_measure: "",
          price: 0,
        });
      }
    }
  }, [isOpen, ingredient, reset]);

  if (!isOpen) return null;

  const onSubmit: SubmitHandler<CreateIngredient> = async (data) => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const ingredientData = {
        name: data.name.toLowerCase(),
        quantity: Number(data.quantity),
        unit_of_measure: data.unit_of_measure,
        price: Number(data.price),
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("ingredients")
          .update(ingredientData)
          .eq("id", ingredient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ingredients")
          .insert(ingredientData);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar ingrediente:", error);
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
            {isEditMode ? "Editar Ingrediente" : "Agregar Ingrediente"}
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
              Nombre del ingrediente <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register("name", {
                required: "El nombre es requerido",
                maxLength: { value: 50, message: "Máximo 50 caracteres" },
              })}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Harina"
            />
          </div>

          {/* Cantidad y Unidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1.5">
                Cantidad <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register("quantity", {
                  required: "La cantidad es requerida",
                  min: { value: 0.01, message: "Debe ser mayor a 0" },
                })}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1.5">
                Unidad <span className="text-red-600">*</span>
              </label>
              <select
                {...register("unit_of_measure", {
                  required: "Selecciona una unidad",
                })}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
              >
                <option value="">Seleccionar</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="und">unidad</option>
              </select>
            </div>
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">
              Precio (S/.) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("price", {
                required: "El precio es requerido",
                min: { value: 0, message: "No puede ser negativo" },
              })}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
              placeholder="50.00"
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

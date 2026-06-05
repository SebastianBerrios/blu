"use client";

import type { UseFormRegister } from "react-hook-form";
import type { CreateRecipe } from "@/types";

interface RecipeMetadataSectionProps {
  register: UseFormRegister<CreateRecipe>;
  isSubmitting: boolean;
  nameReadOnly: boolean;
  fieldsReadOnly: boolean;
}

export default function RecipeMetadataSection({
  register,
  isSubmitting,
  nameReadOnly,
  fieldsReadOnly,
}: RecipeMetadataSectionProps) {
  return (
    <>
      {/* Recipe name */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Nombre de la receta <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          {...register("name", {
            required: "El nombre es requerido",
            maxLength: { value: 50, message: "Máximo 50 caracteres" },
          })}
          disabled={isSubmitting}
          readOnly={nameReadOnly}
          className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 ${nameReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          placeholder="Ej: Fudge"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Descripción de la receta
        </label>
        <textarea
          {...register("description")}
          disabled={isSubmitting}
          readOnly={fieldsReadOnly}
          rows={3}
          className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 ${fieldsReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          placeholder="Ej: Espresso doble servido sobre helado de vainilla"
        />
      </div>

      {/* Preparation steps */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Preparación
        </label>
        <textarea
          {...register("preparation_steps")}
          disabled={isSubmitting}
          readOnly={fieldsReadOnly}
          rows={4}
          className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 ${fieldsReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          placeholder="Ej: 1. Preparar un espresso doble. 2. Servir sobre el helado..."
        />
      </div>
    </>
  );
}

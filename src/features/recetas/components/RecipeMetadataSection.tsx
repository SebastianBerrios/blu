"use client";

import type { UseFormRegister } from "react-hook-form";
import type { CreateRecipe } from "@/types";

interface RecipeMetadataSectionProps {
  register: UseFormRegister<CreateRecipe>;
  isSubmitting: boolean;
  readOnlyMeta: boolean;
  hidePrice: boolean;
}

export default function RecipeMetadataSection({
  register,
  isSubmitting,
  readOnlyMeta,
  hidePrice,
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
          readOnly={readOnlyMeta}
          className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 ${readOnlyMeta ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          placeholder="Ej: Fudge"
        />
      </div>

      {/* Description */}
      {hidePrice ? (
        <input type="hidden" {...register("description")} />
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1.5">
            Descripción de la receta <span className="text-red-600">*</span>
          </label>
          <textarea
            {...register("description", {
              required: "La descripción es requerida",
            })}
            disabled={isSubmitting}
            readOnly={readOnlyMeta}
            rows={3}
            className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 ${readOnlyMeta ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
            placeholder="Ej: Mezclar la leche con la leche condensada..."
          />
        </div>
      )}
    </>
  );
}

"use client";

import type { UseFormRegister } from "react-hook-form";
import type { CreateRecipe } from "@/types";
import { UNIT_OPTIONS } from "@/features/recetas/constants";

interface RecipeYieldSectionProps {
  register: UseFormRegister<CreateRecipe>;
  isSubmitting: boolean;
  readOnlyMeta: boolean;
}

export default function RecipeYieldSection({
  register,
  isSubmitting,
  readOnlyMeta,
}: RecipeYieldSectionProps) {
  return (
    <div className="border-2 border-blue-300 rounded-lg p-4 bg-linear-to-br from-blue-50 to-white">
      <h3 className="text-base font-semibold text-blue-900 mb-3">
        Rendimiento de la Receta
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1.5">
            Cantidad <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("quantity", {
              required: "La cantidad es requerida",
              min: { value: 0.01, message: "Debe ser mayor a 0" },
            })}
            disabled={isSubmitting || readOnlyMeta}
            className={`w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 ${readOnlyMeta ? "text-gray-500 cursor-not-allowed" : ""}`}
            placeholder="150"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1.5">
            Unidad <span className="text-red-600">*</span>
          </label>
          <select
            {...register("unit_of_measure", {
              required: "La unidad de medida es requerida",
            })}
            disabled={isSubmitting || readOnlyMeta}
            className={`w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 ${readOnlyMeta ? "text-gray-500 cursor-not-allowed" : ""}`}
          >
            <option value="">Seleccionar</option>
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!readOnlyMeta && (
        <div className="bg-blue-100 rounded-lg p-3 border border-blue-200 mt-3">
          <p className="text-xs text-blue-800">
            <strong>Ejemplo:</strong> Si tu receta produce 150g de fudge,
            ingresa:
          </p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4">
            <li>
              • Cantidad: <strong>150</strong>
            </li>
            <li>
              • Unidad: <strong>g</strong>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import type { UseFormRegister } from "react-hook-form";
import type { CreateRecipe } from "@/types";

interface RecipeManufacturingCostProps {
  register: UseFormRegister<CreateRecipe>;
}

/**
 * Read-only manufacturing cost display. Value is synced by the parent via
 * setValue("manufacturing_cost", ...) whenever totalCost changes.
 */
export default function RecipeManufacturingCost({
  register,
}: RecipeManufacturingCostProps) {
  return (
    <div className="border-2 border-green-300 rounded-lg p-4 bg-linear-to-br from-green-50 to-white">
      <label className="block text-sm font-medium text-green-900 mb-1.5">
        Costo de fabricación (calculado automáticamente)
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
          S/
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          {...register("manufacturing_cost")}
          disabled
          className="w-full pl-8 pr-4 py-3 border-2 border-green-300 rounded-lg bg-white text-gray-800 font-semibold text-lg cursor-not-allowed"
          placeholder="0.00"
        />
      </div>
      <p className="text-xs text-green-700 mt-2">
        Este costo se calcula automaticamente sumando los precios de
        todos los ingredientes
      </p>
    </div>
  );
}

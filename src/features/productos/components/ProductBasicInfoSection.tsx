"use client";

import type { UseFormRegister } from "react-hook-form";
import type { CreateProduct, Category } from "@/types";

interface ProductBasicInfoSectionProps {
  register: UseFormRegister<CreateProduct>;
  categories: Category[];
  isSubmitting: boolean;
}

export default function ProductBasicInfoSection({
  register,
  categories,
  isSubmitting,
}: ProductBasicInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Nombre del producto <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          {...register("name", {
            required: "El nombre es requerido",
            maxLength: { value: 50, message: "Máximo 50 caracteres" },
          })}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          placeholder="Ej: Cheesecake de Fresa"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Categoría <span className="text-red-600">*</span>
        </label>
        <select
          {...register("categoryId", {
            required: "La categoría es requerida",
            valueAsNumber: true,
          })}
          defaultValue=""
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
        >
          <option value="">Seleccionar</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Temperatura
        </label>
        <select
          {...register("temperatura")}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
        >
          <option value="">Sin especificar</option>
          <option value="caliente">Caliente</option>
          <option value="frío">Frío</option>
          <option value="ambos">Ambos</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Tipo de leche
        </label>
        <select
          {...register("tipo_leche")}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
        >
          <option value="">Sin leche</option>
          <option value="entera">Entera</option>
          <option value="deslactosada">Deslactosada</option>
        </select>
      </div>
    </div>
  );
}

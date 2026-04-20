"use client";

import { Bike, Calculator, Receipt } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";
import type { CreateProduct } from "@/types";
import { RAPPI_SUGGESTED_PRICE_MULTIPLIER } from "@/features/ventas/constants";

export interface TargetPercentageOption {
  title: string;
  value: number;
}

interface PricingSectionProps {
  register: UseFormRegister<CreateProduct>;
  targetOptions: TargetPercentageOption[];
  selectedOptionTitle: string;
  onSelectOption: (title: string) => void;
  totalCost: number;
  suggestedPrice: number;
  profit: number;
  onApplySuggestedPrice: () => void;
  priceValue: number;
  onApplySuggestedRappiPrice: () => void;
}

export default function PricingSection({
  register,
  targetOptions,
  selectedOptionTitle,
  onSelectOption,
  totalCost,
  suggestedPrice,
  profit,
  onApplySuggestedPrice,
  priceValue,
  onApplySuggestedRappiPrice,
}: PricingSectionProps) {
  const currentTargetPercentage =
    targetOptions.find((opt) => opt.title === selectedOptionTitle)?.value || 0;
  const suggestedRappiPrice = Number((priceValue * RAPPI_SUGGESTED_PRICE_MULTIPLIER).toFixed(2));

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Selector de Margen */}
      <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Margen Objetivo
          </h3>
          <span className="text-xs font-bold text-purple-700 bg-white px-2 py-1 rounded border border-purple-100">
            {currentTargetPercentage}% sobre costo
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {targetOptions.map((option) => {
            const isActive = selectedOptionTitle === option.title;
            return (
              <button
                key={option.title}
                type="button"
                onClick={() => onSelectOption(option.title)}
                className={`px-3 py-2.5 min-h-[44px] rounded-md text-xs font-medium transition-all border ${
                  isActive
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-white text-purple-700 border-purple-200 hover:border-purple-300 hover:bg-purple-100"
                }`}
              >
                {option.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Análisis Financiero */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-gradient-to-br from-green-50 to-white">
        <h3 className="text-base font-semibold text-green-900 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Precio Final
        </h3>

        <div className="grid grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-green-700 mb-1">
                Costo Unitario (+5% merma)
              </label>
              <div className="text-lg font-semibold text-green-900">
                S/ {totalCost.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-green-700 mb-1">
                Precio Sugerido
              </label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-700">
                  S/ {suggestedPrice.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={onApplySuggestedPrice}
                  disabled={!totalCost}
                  className="text-[10px] uppercase tracking-wide font-bold bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
            <label className="block text-sm font-bold text-green-900 mb-1.5">
              Precio de Venta (S/)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("price", {
                required: "Requerido",
                min: 0.01,
              })}
              className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-xl text-green-900 text-right"
              placeholder="0.00"
            />
            <div className="mt-2 text-right border-t border-dashed border-green-200 pt-2">
              <span className="text-xs text-green-600 mr-2">
                Ganancia Neta:
              </span>
              <span
                className={`font-bold ${
                  profit >= 0 ? "text-green-700" : "text-red-500"
                }`}
              >
                S/ {profit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Precio Rappi */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-gradient-to-br from-orange-50 to-white">
        <h3 className="text-base font-semibold text-orange-900 mb-3 flex items-center gap-2">
          <Bike className="w-5 h-5" />
          Precio Rappi
          <span className="text-[10px] font-normal text-orange-700 ml-auto">
            Opcional. Si se deja vacío, se usará el precio normal × {RAPPI_SUGGESTED_PRICE_MULTIPLIER.toFixed(1)}.
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-6 items-start">
          <div>
            <label className="block text-xs font-medium text-orange-700 mb-1">
              Sugerido (×{RAPPI_SUGGESTED_PRICE_MULTIPLIER.toFixed(1)})
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-orange-700">
                S/ {suggestedRappiPrice.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={onApplySuggestedRappiPrice}
                disabled={!priceValue}
                className="text-[10px] uppercase tracking-wide font-bold bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
            <p className="mt-2 text-xs text-orange-700">
              Rappi cobra 20% de comisión; el ingreso neto será ~80% del precio que ingreses.
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
            <label className="block text-sm font-bold text-orange-900 mb-1.5">
              Precio Rappi (S/)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register("rappi_price")}
              className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-xl text-orange-900 text-right"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Tag } from "lucide-react";
import type { DiscountMode } from "../types";

interface DiscountSectionProps {
  grossTotal: number;
  discountAmount: number;
  netPayable: number;
  totalDiscountMode: DiscountMode;
  totalDiscountValue: string;
  onModeChange: (mode: DiscountMode) => void;
  onValueChange: (value: string) => void;
  isSubmitting?: boolean;
}

/**
 * Descuento de nivel total + resumen Bruto / Descuento / Neto. El descuento por
 * producto se ingresa en la lista de productos; aquí se suma.
 */
export default function DiscountSection({
  grossTotal,
  discountAmount,
  netPayable,
  totalDiscountMode,
  totalDiscountValue,
  onModeChange,
  onValueChange,
  isSubmitting = false,
}: DiscountSectionProps) {
  return (
    <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/40 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-amber-700" />
        <span className="text-sm font-semibold text-amber-900">
          Descuento
        </span>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Descuento al total
        </label>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
            {(["monto", "porcentaje"] as DiscountMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                disabled={isSubmitting}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  totalDiscountMode === m
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m === "monto" ? "S/" : "%"}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="0"
            step={totalDiscountMode === "monto" ? "0.01" : "1"}
            value={totalDiscountValue}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            placeholder="0"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-amber-200 space-y-1 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal (bruto):</span>
          <span className="tabular-nums">S/ {grossTotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-red-700">
            <span>Descuento:</span>
            <span className="tabular-nums">− S/ {discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-green-700">
          <span>Total a cobrar:</span>
          <span className="tabular-nums">S/ {netPayable.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

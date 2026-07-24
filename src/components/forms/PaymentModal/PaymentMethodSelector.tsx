"use client";

import type { PaymentMethod } from "@/types";
import { PAYMENT_TONE, badgeClassName } from "@/components/ui/Badge";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; color: string }[] = [
  { value: "Efectivo", label: "Efectivo", color: badgeClassName(PAYMENT_TONE.Efectivo) },
  { value: "Plin", label: "Plin", color: badgeClassName(PAYMENT_TONE.Plin) },
  {
    value: "Efectivo + Plin",
    label: "Efectivo + Plin",
    color: badgeClassName(PAYMENT_TONE["Efectivo + Plin"]),
  },
  { value: "POS", label: "POS", color: badgeClassName(PAYMENT_TONE.POS) },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled: boolean;
}

export default function PaymentMethodSelector({
  value,
  onSelect,
  disabled,
}: PaymentMethodSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">
        Método de pago
      </label>
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onSelect(method.value)}
            disabled={disabled}
            className={`flex-1 px-3 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all text-sm ${
              value === method.value
                ? `${method.color} border-current`
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {method.label}
          </button>
        ))}
      </div>
    </div>
  );
}

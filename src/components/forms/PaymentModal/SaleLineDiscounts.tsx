"use client";

import type { DiscountMode, SaleProductLine } from "@/features/ventas/types";
import LineDiscountInput from "@/features/ventas/components/LineDiscountInput";
import { resolveLineDiscount, round2 } from "@/features/ventas/utils/discount";

interface SaleLineDiscountsProps {
  saleProducts: SaleProductLine[];
  onLineDiscount: (index: number, mode: DiscountMode, value: number) => void;
  isSubmitting: boolean;
}

export default function SaleLineDiscounts({
  saleProducts,
  onLineDiscount,
  isSubmitting,
}: SaleLineDiscountsProps) {
  return (
    <div className="space-y-2">
      {saleProducts.map((item, idx) => {
        const lineDiscount = resolveLineDiscount(item);
        const lineNet = round2(item.subtotal - lineDiscount);
        return (
          <div
            key={`${item.product_id}-${item.temperatura}-${item.tipo_leche}-${item.loyalty_reward ?? "none"}-${idx}`}
            className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 capitalize truncate">
                {item.product_name}
              </p>
              <p className="text-xs text-slate-500">
                {item.quantity} × S/ {item.unit_price.toFixed(2)}
                {lineDiscount > 0 && (
                  <span className="ml-1 text-green-700">
                    → S/ {lineNet.toFixed(2)}
                  </span>
                )}
              </p>
            </div>
            <LineDiscountInput
              mode={item.discount_mode ?? "monto"}
              value={item.discount_value}
              onChange={(mode, value) =>
                onLineDiscount(idx, mode as DiscountMode, value)
              }
              disabled={isSubmitting}
            />
          </div>
        );
      })}
    </div>
  );
}

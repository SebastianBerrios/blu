"use client";

import { CreditCard } from "lucide-react";
import { POS_COMMISSION_RATE } from "@/features/ventas/constants";

interface PosPaymentBreakdownProps {
  totalPrice: number;
}

export default function PosPaymentBreakdown({
  totalPrice,
}: PosPaymentBreakdownProps) {
  const commission = Number((totalPrice * POS_COMMISSION_RATE).toFixed(2));
  const net = Number((totalPrice - commission).toFixed(2));
  return (
    <div className="border-2 border-indigo-300 rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-white">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-indigo-700" />
        <span className="text-sm font-semibold text-indigo-900">
          Pago con POS
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="bg-white border border-indigo-200 rounded-lg p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-indigo-700">
            Subtotal
          </p>
          <p className="font-bold text-indigo-900 tabular-nums">
            S/ {totalPrice.toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-indigo-200 rounded-lg p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-indigo-700">
            Comisión {+(POS_COMMISSION_RATE * 100).toFixed(2)}%
          </p>
          <p className="font-bold text-red-600 tabular-nums">
            − S/ {commission.toFixed(2)}
          </p>
        </div>
        <div className="bg-indigo-600 border border-indigo-700 rounded-lg p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-indigo-100">
            Neto a recibir
          </p>
          <p className="font-bold text-white tabular-nums">
            S/ {net.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

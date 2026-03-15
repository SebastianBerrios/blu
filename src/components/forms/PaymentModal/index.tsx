"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { SaleWithProducts, PaymentMethod } from "@/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SaleWithProducts;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; color: string }[] = [
  { value: "Efectivo", label: "Efectivo", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "Yape", label: "Yape", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "Efectivo + Yape", label: "Efectivo + Yape", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
];

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [yapeAmount, setYapeAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isMixed = paymentMethod === "Efectivo + Yape";

  const handleCashChange = (value: string) => {
    setCashAmount(value);
    const cash = parseFloat(value);
    if (!isNaN(cash) && cash >= 0 && cash <= sale.total_price) {
      setYapeAmount((sale.total_price - cash).toFixed(2));
    }
  };

  const handleYapeChange = (value: string) => {
    setYapeAmount(value);
    const yape = parseFloat(value);
    if (!isNaN(yape) && yape >= 0 && yape <= sale.total_price) {
      setCashAmount((sale.total_price - yape).toFixed(2));
    }
  };

  const handleSubmit = async () => {
    let cash: number | null = null;
    let yape: number | null = null;

    if (paymentMethod === "Efectivo") {
      cash = sale.total_price;
    } else if (paymentMethod === "Yape") {
      yape = sale.total_price;
    } else {
      cash = parseFloat(cashAmount);
      yape = parseFloat(yapeAmount);
      if (isNaN(cash) || isNaN(yape) || cash < 0 || yape < 0) {
        alert("Ingresa montos válidos");
        return;
      }
      if (Math.abs(cash + yape - sale.total_price) > 0.01) {
        alert("Los montos deben sumar el total de la venta");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("sales")
        .update({
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          cash_amount: cash,
          yape_amount: yape,
        })
        .eq("id", sale.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al registrar pago:", error);
      alert("Ocurrió un error al registrar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-200 bg-primary-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-primary-900">
            Registrar Pago
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-primary-700" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Resumen de la venta */}
          <div className="bg-primary-50 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-primary-700">
              <span className="font-medium">{sale.order_type}</span>
              <span className="mx-2">·</span>
              <span>{sale.sale_products.length} producto{sale.sale_products.length !== 1 ? "s" : ""}</span>
            </div>
            <span className="text-xl font-bold text-primary-900">
              S/ {sale.total_price.toFixed(2)}
            </span>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-2">
              Método de pago
            </label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.value);
                    setCashAmount("");
                    setYapeAmount("");
                  }}
                  disabled={isSubmitting}
                  className={`flex-1 px-3 py-2.5 rounded-lg border-2 font-medium transition-all text-sm ${
                    paymentMethod === method.value
                      ? `${method.color} border-current`
                      : "bg-white text-primary-600 border-primary-200 hover:bg-primary-50"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Montos */}
          {isMixed ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1.5">
                  Monto en efectivo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 text-sm">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => handleCashChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1.5">
                  Monto en Yape
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 text-sm">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={yapeAmount}
                    onChange={(e) => handleYapeChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <span className="text-sm text-green-700">Monto total en {paymentMethod}:</span>
              <span className="block text-lg font-bold text-green-800 mt-1">
                S/ {sale.total_price.toFixed(2)}
              </span>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border-2 border-primary-300 text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-green-700 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

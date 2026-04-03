import type { PaymentMethod } from "@/types";
import { PAYMENT_METHODS } from "../constants";

interface PaymentSectionProps {
  registerPayment: boolean;
  onRegisterPaymentChange: (value: boolean) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  cashAmount: string;
  setCashAmount: (value: string) => void;
  yapeAmount: string;
  setYapeAmount: (value: string) => void;
  totalPrice: number;
  isSubmitting: boolean;
  isEditMode: boolean;
  existingPaymentMethod?: string | null;
}

export default function PaymentSection({
  registerPayment,
  onRegisterPaymentChange,
  paymentMethod,
  onPaymentMethodChange,
  cashAmount,
  setCashAmount,
  yapeAmount,
  setYapeAmount,
  totalPrice,
  isSubmitting,
  isEditMode,
  existingPaymentMethod,
}: PaymentSectionProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={registerPayment}
          onChange={(e) => onRegisterPaymentChange(e.target.checked)}
          disabled={isSubmitting}
          className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm font-medium text-slate-900">
          Registrar pago{" "}
          {isEditMode && existingPaymentMethod ? "" : "ahora"}
        </span>
      </label>

      {registerPayment && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Método de pago
            </label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => onPaymentMethodChange(method.value)}
                  disabled={isSubmitting}
                  className={`flex-1 px-3 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all text-sm ${
                    paymentMethod === method.value
                      ? `${method.color} border-current`
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "Efectivo + Yape" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">
                  Efectivo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    S/
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => {
                      setCashAmount(e.target.value);
                      const cash = parseFloat(e.target.value);
                      if (!isNaN(cash) && cash >= 0 && cash <= totalPrice) {
                        setYapeAmount((totalPrice - cash).toFixed(2));
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">
                  Yape
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    S/
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={yapeAmount}
                    onChange={(e) => {
                      setYapeAmount(e.target.value);
                      const yape = parseFloat(e.target.value);
                      if (!isNaN(yape) && yape >= 0 && yape <= totalPrice) {
                        setCashAmount((totalPrice - yape).toFixed(2));
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <span className="text-sm text-green-700">
                Total en {paymentMethod}:
              </span>
              <span className="ml-2 font-bold text-green-800">
                S/ {totalPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

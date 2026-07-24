"use client";

interface MixedPaymentInputsProps {
  cashAmount: string;
  plinAmount: string;
  onCashChange: (value: string) => void;
  onPlinChange: (value: string) => void;
  disabled: boolean;
}

export default function MixedPaymentInputs({
  cashAmount,
  plinAmount,
  onCashChange,
  onPlinChange,
  disabled,
}: MixedPaymentInputsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Monto en efectivo
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cashAmount}
            onChange={(e) => onCashChange(e.target.value)}
            disabled={disabled}
            className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            placeholder="0.00"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Monto en Plin
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={plinAmount}
            onChange={(e) => onPlinChange(e.target.value)}
            disabled={disabled}
            className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            placeholder="0.00"
          />
        </div>
      </div>
    </div>
  );
}

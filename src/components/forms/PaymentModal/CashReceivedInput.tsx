"use client";

interface CashReceivedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  change: number;
  disabled: boolean;
}

export default function CashReceivedInput({
  value,
  onChange,
  placeholder,
  change,
  disabled,
}: CashReceivedInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-1.5">
        Efectivo recibido{" "}
        <span className="text-slate-500 text-xs">(opcional)</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
          S/
        </span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
          placeholder={placeholder}
        />
      </div>
      {change > 0 && (
        <p className="mt-2 text-sm font-medium text-amber-700">
          Vuelto: S/ {change.toFixed(2)}
        </p>
      )}
    </div>
  );
}

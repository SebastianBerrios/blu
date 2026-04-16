"use client";

interface YapeChangeSectionProps {
  hasYapeChange: boolean;
  yapeChange: string;
  onToggle: (value: boolean) => void;
  onChange: (value: string) => void;
  isSubmitting: boolean;
}

export default function YapeChangeSection({
  hasYapeChange,
  yapeChange,
  onToggle,
  onChange,
  isSubmitting,
}: YapeChangeSectionProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hasYapeChange}
          onChange={(e) => {
            onToggle(e.target.checked);
            if (!e.target.checked) onChange("");
          }}
          disabled={isSubmitting}
          className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm font-medium text-slate-900">
          Vuelto por Yape
        </span>
      </label>

      {hasYapeChange && (
        <div className="mt-3">
          <label className="block text-sm font-medium text-slate-900 mb-1.5">
            Monto del vuelto
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              S/
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={yapeChange}
              onChange={(e) => onChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            El vuelto que el vendedor te devolvió por Yape (se registra en la Cuenta Bancaria)
          </p>
        </div>
      )}
    </div>
  );
}

import type { DiscountMode } from "../types";

interface LineDiscountInputProps {
  mode: DiscountMode;
  value: number | undefined;
  onChange: (mode: DiscountMode, value: number) => void;
  disabled?: boolean;
}

/**
 * Control compacto de descuento por línea: alterna entre S/ y % e ingresa el
 * valor.
 */
export default function LineDiscountInput({
  mode,
  value,
  onChange,
  disabled = false,
}: LineDiscountInputProps) {
  const toggleMode = () => {
    onChange(mode === "monto" ? "porcentaje" : "monto", value ?? 0);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        Desc.
      </span>
      <button
        type="button"
        onClick={toggleMode}
        disabled={disabled}
        className="px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 min-w-[34px]"
        title="Cambiar entre soles y porcentaje"
      >
        {mode === "monto" ? "S/" : "%"}
      </button>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={mode === "monto" ? "0.01" : "1"}
        value={value === undefined ? "" : String(value)}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(mode, Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
        }}
        disabled={disabled}
        className="w-16 px-2 py-1 border border-slate-300 rounded-md text-sm text-right focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
        placeholder="0"
      />
    </div>
  );
}

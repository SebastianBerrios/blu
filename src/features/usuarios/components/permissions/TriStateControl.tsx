/**
 * TriStateControl — segmented three-way control for per-user permission overrides.
 * Values: "inherit" | "on" | "off". Labels in Spanish.
 * Presentational only: no service/createClient imports.
 */

export type TriStateValue = "inherit" | "on" | "off";

interface TriStateControlProps {
  value: TriStateValue;
  disabled?: boolean;
  onChange: (next: TriStateValue) => void;
}

const SEGMENTS: { value: TriStateValue; label: string }[] = [
  { value: "inherit", label: "Hereda" },
  { value: "on", label: "Sí" },
  { value: "off", label: "No" },
];

export default function TriStateControl({ value, disabled = false, onChange }: TriStateControlProps) {
  return (
    <div
      className="inline-flex flex-col sm:flex-row rounded-md border border-slate-200 overflow-hidden"
      role="radiogroup"
      aria-label="Estado de permiso"
    >
      {SEGMENTS.map((seg) => {
        const isActive = value === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            role="radio"
            disabled={disabled}
            onClick={() => onChange(seg.value)}
            aria-checked={isActive}
            className={`min-h-[44px] px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              border-b sm:border-b-0 sm:border-r border-slate-200 last:border-0
              ${
                isActive
                  ? "bg-primary-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

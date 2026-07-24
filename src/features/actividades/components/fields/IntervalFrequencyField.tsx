interface IntervalFrequencyFieldProps {
  intervalDays: number;
  anchorDate: string;
  onIntervalDaysChange: (value: number) => void;
  onAnchorDateChange: (value: string) => void;
  isSubmitting: boolean;
  inputClass: string;
}

export default function IntervalFrequencyField({
  intervalDays,
  anchorDate,
  onIntervalDaysChange,
  onAnchorDateChange,
  isSubmitting,
  inputClass,
}: IntervalFrequencyFieldProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Cada cuántos días <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-1.5 mb-2">
          {[
            { n: 2, label: "Interdiario" },
            { n: 3, label: "Cada 3" },
          ].map(({ n, label }) => (
            <button
              key={n}
              type="button"
              onClick={() => onIntervalDaysChange(n)}
              disabled={isSubmitting}
              className={`inline-flex items-center text-xs font-medium px-3 py-2 min-h-[44px] rounded-full border transition-colors ${
                intervalDays === n
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-white text-slate-600 border-slate-300 hover:border-primary-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={intervalDays}
          onChange={(e) => onIntervalDaysChange(Number(e.target.value))}
          disabled={isSubmitting}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Desde <span className="text-red-600">*</span>
        </label>
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => onAnchorDateChange(e.target.value)}
          disabled={isSubmitting}
          className={inputClass}
        />
        <p className="text-[11px] text-slate-500 mt-1">Fecha de referencia del ciclo</p>
      </div>
    </div>
  );
}

import { DAY_LABELS_SHORT } from "../../constants";

interface WeeklyDaysFieldProps {
  daysOfWeek: number[];
  onToggleDay: (day: number) => void;
  isSubmitting: boolean;
}

export default function WeeklyDaysField({
  daysOfWeek,
  onToggleDay,
  isSubmitting,
}: WeeklyDaysFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-1.5">
        Días de la semana <span className="text-red-600">*</span>
      </label>
      <div className="flex gap-2 flex-wrap">
        {DAY_LABELS_SHORT.map((label, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onToggleDay(idx)}
            disabled={isSubmitting}
            className={`inline-flex items-center justify-center px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg border transition-colors ${
              daysOfWeek.includes(idx)
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white text-slate-600 border-slate-300 hover:border-primary-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

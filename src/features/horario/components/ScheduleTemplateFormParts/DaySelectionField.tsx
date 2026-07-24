import { Check } from "lucide-react";
import { DAY_LABELS } from "@/types/schedule";
import type { DayOfWeek } from "@/types";

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

interface DaySelectionFieldProps {
  isEditMode: boolean;
  dayOfWeek: DayOfWeek;
  onDayOfWeekChange: (day: DayOfWeek) => void;
  selectedDays: Set<DayOfWeek>;
  onToggleDay: (day: DayOfWeek) => void;
  disabled: boolean;
}

export default function DaySelectionField({
  isEditMode,
  dayOfWeek,
  onDayOfWeekChange,
  selectedDays,
  onToggleDay,
  disabled,
}: DaySelectionFieldProps) {
  return isEditMode ? (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-1.5">
        Día <span className="text-red-600">*</span>
      </label>
      <select
        value={dayOfWeek}
        onChange={(e) => onDayOfWeekChange(Number(e.target.value) as DayOfWeek)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
      >
        {ALL_DAYS.map((d) => (
          <option key={d} value={d}>
            {DAY_LABELS[d]}
          </option>
        ))}
      </select>
    </div>
  ) : (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-1.5">
        Días <span className="text-red-600">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ALL_DAYS.map((day) => {
          const isSelected = selectedDays.has(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggleDay(day)}
              disabled={disabled}
              className={`
                        relative flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px]
                        rounded-lg text-sm font-medium transition-all
                        ${
                          isSelected
                            ? "bg-primary-50 text-primary-800 border-2 border-primary-500 shadow-sm"
                            : "bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
            >
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              {DAY_LABELS[day]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

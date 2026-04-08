import type { ScheduleSlot } from "@/types";
import { DAY_LABELS_SHORT } from "../constants";
import { toLocalDateStr } from "../utils/calendarDates";
import CalendarDayBadge from "./CalendarDayBadge";

interface MonthlyCalendarGridProps {
  slots: ScheduleSlot[];
  gridDates: string[];
  currentMonth: number;
  currentYear: number;
  isAdmin: boolean;
  onDayClick: (date: string) => void;
}

export default function MonthlyCalendarGrid({
  slots,
  gridDates,
  currentMonth,
  currentYear,
  isAdmin,
  onDayClick,
}: MonthlyCalendarGridProps) {
  const today = toLocalDateStr(new Date());

  // Group slots by date
  const slotsByDate = new Map<string, ScheduleSlot[]>();
  for (const s of slots) {
    const existing = slotsByDate.get(s.date) ?? [];
    existing.push(s);
    slotsByDate.set(s.date, existing);
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {DAY_LABELS_SHORT.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-l border-slate-200">
        {gridDates.map((date) => {
          const d = new Date(date + "T00:00:00");
          const dayNum = d.getDate();
          const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          const isToday = date === today;
          const daySlots = slotsByDate.get(date) ?? [];
          const visibleSlots = daySlots.slice(0, 3);
          const extraCount = daySlots.length - 3;

          return (
            <div
              key={date}
              onClick={() => isAdmin && onDayClick(date)}
              className={`
                min-h-[100px] border-r border-b border-slate-200 p-1.5
                ${isCurrentMonth ? "bg-white" : "bg-slate-50 opacity-50"}
                ${isAdmin ? "cursor-pointer hover:bg-primary-50/50 transition-colors" : ""}
                ${isToday ? "ring-2 ring-inset ring-primary-500" : ""}
              `}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  isToday
                    ? "text-white bg-primary-500 w-6 h-6 rounded-full flex items-center justify-center"
                    : isCurrentMonth
                    ? "text-slate-700"
                    : "text-slate-400"
                }`}
              >
                {dayNum}
              </div>
              <div className="space-y-0.5">
                {visibleSlots.map((slot, i) => (
                  <CalendarDayBadge key={`${slot.user_id}-${i}`} slot={slot} />
                ))}
                {extraCount > 0 && (
                  <div className="text-[10px] text-slate-500 font-medium pl-1">
                    +{extraCount} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

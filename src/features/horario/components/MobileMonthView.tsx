import { useState } from "react";
import type { ScheduleSlot } from "@/types";
import { ROLE_COLORS } from "../constants";
import { toLocalDateStr } from "../utils/calendarDates";
import MobileDayView from "./MobileDayView";

interface MobileMonthViewProps {
  slots: ScheduleSlot[];
  gridDates: string[];
  currentMonth: number;
  currentYear: number;
  isAdmin: boolean;
  onDayClick: (date: string) => void;
  onMarkAbsence?: (slot: ScheduleSlot) => void;
}

const MINI_DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export default function MobileMonthView({
  slots,
  gridDates,
  currentMonth,
  currentYear,
  isAdmin,
  onDayClick,
  onMarkAbsence,
}: MobileMonthViewProps) {
  const today = toLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  // Group slots by date
  const slotsByDate = new Map<string, ScheduleSlot[]>();
  for (const s of slots) {
    const existing = slotsByDate.get(s.date) ?? [];
    existing.push(s);
    slotsByDate.set(s.date, existing);
  }

  // Unique roles per date for dots
  const rolesByDate = new Map<string, Set<string>>();
  for (const [date, dateSlots] of slotsByDate) {
    rolesByDate.set(date, new Set(dateSlots.map((s) => s.user_role)));
  }

  const selectedSlots = slotsByDate.get(selectedDate) ?? [];

  const handleDateTap = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <div>
      {/* Mini calendar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {MINI_DAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[10px] font-semibold text-slate-400 py-1">
              {label}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7">
          {gridDates.map((date) => {
            const d = new Date(date + "T00:00:00");
            const dayNum = d.getDate();
            const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const roles = rolesByDate.get(date);
            const slotCount = slotsByDate.get(date)?.length ?? 0;

            return (
              <button
                key={date}
                onClick={() => handleDateTap(date)}
                className={`
                  relative flex flex-col items-center py-1.5 rounded-lg transition-colors
                  ${isSelected ? "bg-primary-500 text-white" : ""}
                  ${!isSelected && isToday ? "bg-primary-100 text-primary-700" : ""}
                  ${!isSelected && !isToday && isCurrentMonth ? "text-slate-700" : ""}
                  ${!isCurrentMonth ? "opacity-30" : ""}
                `}
              >
                <span className="text-xs font-medium">{dayNum}</span>
                {/* Role dots */}
                {roles && roles.size > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from(roles).slice(0, 3).map((role) => {
                      const colors = ROLE_COLORS[role] ?? ROLE_COLORS.admin;
                      return (
                        <span
                          key={role}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/70" : colors.bg.replace("bg-", "bg-").replace("-100", "-400")}`}
                          style={
                            !isSelected
                              ? {
                                  backgroundColor:
                                    role === "cocinero" ? "#38bdf8" :
                                    role === "barista" ? "#fbbf24" :
                                    "#a78bfa",
                                }
                              : undefined
                          }
                        />
                      );
                    })}
                    {slotCount > 3 && (
                      <span className={`text-[7px] leading-none ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                        …
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 capitalize">
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-PE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h4>
        {isAdmin && (
          <button
            onClick={() => onDayClick(selectedDate)}
            className="text-xs text-primary-600 font-medium hover:underline"
          >
            + Excepción
          </button>
        )}
      </div>

      <MobileDayView slots={selectedSlots} isAdmin={isAdmin} onMarkAbsence={onMarkAbsence} />
    </div>
  );
}

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import type { ScheduleSlot, ScheduleTemplate } from "@/types";
import { DAY_LABELS_FULL, ROLE_COLORS } from "../constants";
import { toLocalDateStr } from "../utils/calendarDates";
import SlotBadge from "./SlotBadge";

interface DesktopScheduleGridProps {
  slots: ScheduleSlot[];
  weekDates: string[];
  templates: ScheduleTemplate[];
  isAdmin: boolean;
  onEditTemplate: (t: ScheduleTemplate) => void;
  onDeleteTemplate: (id: number) => void;
  onMarkAbsence: (slot: ScheduleSlot) => void;
}

export default function DesktopScheduleGrid({
  slots,
  weekDates,
  templates,
  isAdmin,
  onEditTemplate,
  onDeleteTemplate,
  onMarkAbsence,
}: DesktopScheduleGridProps) {
  const usersInSchedule = useMemo(() => {
    const map = new Map<string, { name: string; role: string }>();
    for (const s of slots) {
      if (!map.has(s.user_id)) {
        map.set(s.user_id, { name: s.user_name, role: s.user_role });
      }
    }
    return Array.from(map.entries());
  }, [slots]);

  if (usersInSchedule.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="font-medium">Sin horarios configurados</p>
        {isAdmin && (
          <p className="text-sm mt-1">
            Agrega turnos con el botón &quot;+ Turno&quot;
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {usersInSchedule.map(([userId, info]) => {
        const colors = ROLE_COLORS[info.role] ?? ROLE_COLORS.admin;
        const userSlots = slots.filter((s) => s.user_id === userId);

        return (
          <div
            key={userId}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            {/* User header */}
            <div
              className={`px-4 py-3 ${colors.bg} border-b ${colors.border} flex items-center gap-2`}
            >
              <span className={`font-semibold ${colors.text}`}>
                {info.name}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
              >
                {info.role}
              </span>
            </div>

            {/* Schedule grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-slate-500 font-medium w-20"></th>
                    {DAY_LABELS_FULL.map((day, i) => {
                      const isToday =
                        weekDates[i] ===
                        toLocalDateStr(new Date());
                      return (
                        <th
                          key={i}
                          className={`px-3 py-2 text-center font-medium ${
                            isToday
                              ? "text-primary-700 bg-primary-50"
                              : "text-slate-600"
                          }`}
                        >
                          <div>{day}</div>
                          <div className="text-xs text-slate-400 font-normal">
                            {new Date(
                              weekDates[i] + "T00:00:00"
                            ).getDate()}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Morning block */}
                  <tr>
                    <td className="px-3 py-2 text-xs text-slate-400 align-top">
                      Mañana
                    </td>
                    {weekDates.map((date) => {
                      const daySlots = userSlots.filter(
                        (s) => s.date === date && s.start_time < "14:00"
                      );
                      return (
                        <td
                          key={date}
                          className="px-2 py-2 align-top border-l border-slate-50"
                        >
                          {daySlots.map((slot, si) => (
                            <SlotBadge
                              key={si}
                              slot={slot}
                              colors={colors}
                              isAdmin={isAdmin}
                              templates={templates}
                              onEdit={onEditTemplate}
                              onDelete={onDeleteTemplate}
                              onMarkAbsence={onMarkAbsence}
                            />
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Afternoon block */}
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-400 align-top">
                      Tarde
                    </td>
                    {weekDates.map((date) => {
                      const daySlots = userSlots.filter(
                        (s) => s.date === date && s.start_time >= "14:00"
                      );
                      return (
                        <td
                          key={date}
                          className="px-2 py-2 align-top border-l border-slate-50"
                        >
                          {daySlots.map((slot, si) => (
                            <SlotBadge
                              key={si}
                              slot={slot}
                              colors={colors}
                              isAdmin={isAdmin}
                              templates={templates}
                              onEdit={onEditTemplate}
                              onDelete={onDeleteTemplate}
                              onMarkAbsence={onMarkAbsence}
                            />
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

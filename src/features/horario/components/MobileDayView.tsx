import { Clock, UserX } from "lucide-react";
import type { ScheduleSlot } from "@/types";
import { ROLE_COLORS } from "../constants";

interface MobileDayViewProps {
  slots: ScheduleSlot[];
  isAdmin?: boolean;
  onMarkAbsence?: (slot: ScheduleSlot) => void;
}

export default function MobileDayView({ slots, isAdmin, onMarkAbsence }: MobileDayViewProps) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">Sin turnos este día</p>
      </div>
    );
  }

  // Group by user
  const grouped = new Map<string, ScheduleSlot[]>();
  for (const s of slots) {
    const existing = grouped.get(s.user_id) ?? [];
    existing.push(s);
    grouped.set(s.user_id, existing);
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([userId, userSlots]) => {
        const info = userSlots[0];
        const colors = ROLE_COLORS[info.user_role] ?? ROLE_COLORS.admin;

        return (
          <div
            key={userId}
            className={`bg-white rounded-xl border ${colors.border} overflow-hidden`}
          >
            <div className={`px-4 py-2.5 ${colors.bg} flex items-center gap-2`}>
              <span className={`font-semibold text-sm ${colors.text}`}>
                {info.user_name}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${colors.border} ${colors.text}`}
              >
                {info.user_role}
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {userSlots
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className={`text-sm font-medium ${slot.is_absence || slot.is_day_off ? "text-slate-400 line-through" : "text-slate-700"}`}>
                      {slot.start_time.slice(0, 5)} -{" "}
                      {slot.end_time.slice(0, 5)}
                    </span>
                    {slot.is_absence ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
                        Falta
                      </span>
                    ) : slot.is_day_off ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-semibold">
                        Permiso
                      </span>
                    ) : slot.is_extra_shift ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                        Turno extra
                      </span>
                    ) : slot.is_override ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                        Excepción
                      </span>
                    ) : null}
                    {isAdmin && !slot.is_absence && !slot.is_day_off && !slot.is_extra_shift && onMarkAbsence && (
                      <button
                        onClick={() => onMarkAbsence(slot)}
                        className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Marcar inasistencia"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

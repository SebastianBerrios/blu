import type { ScheduleSlot } from "@/types";
import { ROLE_COLORS } from "../constants";

interface CalendarDayBadgeProps {
  slot: ScheduleSlot;
}

export default function CalendarDayBadge({ slot }: CalendarDayBadgeProps) {
  const colors = ROLE_COLORS[slot.user_role] ?? ROLE_COLORS.admin;
  const firstName = slot.user_name.split(" ")[0];
  const timeRange = `${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)}`;

  const borderColor = slot.is_absence
    ? "border-l-red-500"
    : slot.is_day_off
    ? "border-l-violet-500"
    : slot.is_extra_shift
    ? "border-l-emerald-500"
    : slot.is_override
    ? "border-l-orange-400"
    : "border-l-transparent";

  return (
    <div
      className={`${colors.bg} ${colors.text} border-l-2 ${borderColor} rounded px-1.5 py-0.5 text-[11px] leading-tight truncate ${slot.is_absence || slot.is_day_off ? "opacity-50" : ""}`}
      title={`${slot.user_name} ${timeRange}${slot.is_absence ? " — Falta" : slot.is_day_off ? " — Permiso" : slot.override_reason ? ` — ${slot.override_reason}` : ""}`}
    >
      {slot.is_absence && <span className="text-red-600 font-bold mr-0.5">F</span>}
      {slot.is_day_off && !slot.is_absence && <span className="text-violet-600 font-bold mr-0.5">P</span>}
      <span className="font-medium">{firstName}</span>{" "}
      <span className="opacity-75">{timeRange}</span>
    </div>
  );
}

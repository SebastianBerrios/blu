import { Pencil, Trash2, UserX } from "lucide-react";
import type { ScheduleSlot, ScheduleTemplate } from "@/types";

interface SlotBadgeProps {
  slot: ScheduleSlot;
  colors: { bg: string; text: string; border: string };
  isAdmin: boolean;
  templates: ScheduleTemplate[];
  onEdit: (t: ScheduleTemplate) => void;
  onDelete: (id: number) => void;
  onMarkAbsence: (slot: ScheduleSlot) => void;
}

export default function SlotBadge({
  slot,
  colors,
  isAdmin,
  templates,
  onEdit,
  onDelete,
  onMarkAbsence,
}: SlotBadgeProps) {
  const template = !slot.is_override
    ? templates.find(
        (t) =>
          t.user_id === slot.user_id &&
          t.day_of_week === slot.day_of_week &&
          t.start_time.slice(0, 5) === slot.start_time.slice(0, 5) &&
          t.end_time.slice(0, 5) === slot.end_time.slice(0, 5)
      )
    : undefined;

  const ringClass = slot.is_absence
    ? "ring-1 ring-red-400 opacity-60"
    : slot.is_day_off
    ? "ring-1 ring-violet-400 opacity-60"
    : slot.is_extra_shift
    ? "ring-1 ring-emerald-400"
    : slot.is_override
    ? "ring-1 ring-orange-300"
    : "";

  return (
    <div
      className={`group relative text-xs px-2 py-1.5 rounded-md mb-1 ${colors.bg} ${colors.text} ${ringClass}`}
    >
      <div className="font-medium">
        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
      </div>
      {slot.is_absence && (
        <div className="text-[10px] text-red-600 font-semibold">Falta</div>
      )}
      {slot.is_day_off && !slot.is_absence && (
        <div className="text-[10px] text-violet-600 font-semibold">Permiso</div>
      )}
      {slot.is_extra_shift && (
        <div className="text-[10px] text-emerald-700 font-medium">Extra</div>
      )}
      {slot.override_reason && !slot.is_extra_shift && !slot.is_absence && (
        <div className="text-[10px] opacity-70">{slot.override_reason}</div>
      )}
      {isAdmin && !slot.is_absence && !slot.is_day_off && !slot.is_extra_shift && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
          <button
            onClick={() => onMarkAbsence(slot)}
            className="p-0.5 bg-white rounded shadow hover:bg-red-50"
            title="Marcar inasistencia"
          >
            <UserX className="w-3 h-3 text-red-500" />
          </button>
          {template && (
            <>
              <button
                onClick={() => onEdit(template)}
                className="p-0.5 bg-white rounded shadow hover:bg-slate-100"
              >
                <Pencil className="w-3 h-3 text-slate-500" />
              </button>
              <button
                onClick={() => onDelete(template.id)}
                className="p-0.5 bg-white rounded shadow hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

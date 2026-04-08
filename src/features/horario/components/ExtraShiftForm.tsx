import { useState, useEffect, useMemo } from "react";
import { X, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleUser } from "@/types";
import { createExtraShift } from "@/features/horario/services/scheduleService";
import { toLocalDateStr } from "@/features/horario/utils/calendarDates";

const ALL_USERS_VALUE = "__all__";

interface ExtraShiftFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: ScheduleUser[];
}

export default function ExtraShiftForm({
  isOpen,
  onClose,
  onSuccess,
  users,
}: ExtraShiftFormProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form fields
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("12:30");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setUserId(users[0]?.id ?? "");
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(toLocalDateStr(tomorrow));
      setStartTime("08:30");
      setEndTime("12:30");
      setDescription("");
    }
  }, [isOpen, users]);

  const calculatedHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const hours = endH + endM / 60 - (startH + startM / 60);
    return Math.round(hours * 100) / 100;
  }, [startTime, endTime]);

  if (!isOpen) return null;

  const isAllUsers = userId === ALL_USERS_VALUE;
  const isValid = userId && date && startTime && endTime && calculatedHours > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !user) return;

    const targetUsers = isAllUsers ? users : [users.find((u) => u.id === userId)!];

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      for (const targetUser of targetUsers) {
        await createExtraShift({
          userId: targetUser.id,
          date,
          startTime,
          endTime,
          description: description.trim() || undefined,
          adminId: user.id,
          adminName: profile?.full_name ?? null,
          employeeName: targetUser.full_name ?? "",
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error al crear turno extra:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Error al crear turno extra"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900">
            Turno Extra
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee select */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Empleado <span className="text-red-600">*</span>
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              <option value={ALL_USERS_VALUE}>Todos los trabajadores</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.id} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Fecha <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Hora inicio <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Hora fin <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Hours preview */}
          {calculatedHours > 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-emerald-700">
                {isAllUsers
                  ? `${calculatedHours} ${calculatedHours === 1 ? "hora" : "horas"} × ${users.length} empleados = ${Math.round(calculatedHours * users.length * 100) / 100} horas totales`
                  : `${calculatedHours} ${calculatedHours === 1 ? "hora" : "horas"} se acreditarán`}
              </span>
            </div>
          )}
          {calculatedHours <= 0 && startTime && endTime && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                La hora fin debe ser mayor a la hora inicio
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Cobertura por feriado"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 placeholder:text-slate-400"
            />
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

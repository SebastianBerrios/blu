import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleUser } from "@/types";
import {
  toLocalDateStr,
  createScheduleOverrides,
} from "@/features/horario";

const ALL_USERS_VALUE = "__all__";

interface ScheduleOverrideFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: ScheduleUser[];
  defaultDate?: string;
  defaultUserId?: string;
}

export default function ScheduleOverrideForm({
  isOpen,
  onClose,
  onSuccess,
  users,
  defaultDate,
  defaultUserId,
}: ScheduleOverrideFormProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [isDayOff, setIsDayOff] = useState(true);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("12:30");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setUserId(defaultUserId ?? users[0]?.id ?? "");
      setOverrideDate(defaultDate ?? toLocalDateStr(new Date()));
      setIsDayOff(true);
      setStartTime("08:30");
      setEndTime("12:30");
      setReason("");
    }
  }, [isOpen, users, defaultDate, defaultUserId]);

  if (!isOpen) return null;

  const isAllUsers = userId === ALL_USERS_VALUE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!userId || !overrideDate) return;
    setIsSubmitting(true);

    const targetUsers = isAllUsers ? users : [users.find((u) => u.id === userId)!];
    const descName = isAllUsers ? "Todos los trabajadores" : (targetUsers[0]?.full_name ?? "");

    try {
      await createScheduleOverrides({
        userIds: targetUsers.map((u) => u.id),
        overrideDate,
        isDayOff,
        startTime,
        endTime,
        reason,
        createdBy: user?.id ?? null,
        adminId: user?.id ?? null,
        adminName: profile?.full_name ?? null,
        descriptionName: descName,
      });

      toast.success("Excepción creada");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al crear excepción:", error);
      const msg = error instanceof Error ? error.message : "Error al crear excepción";
      setSubmitError(msg);
      toast.error(msg);
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
            Agregar Excepción
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

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Fecha <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isDayOff"
              checked={isDayOff}
              onChange={(e) => setIsDayOff(e.target.checked)}
              disabled={isSubmitting}
              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isDayOff" className="text-sm font-medium text-slate-900">
              Día libre completo
            </label>
          </div>

          {!isDayOff && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">
                  Hora inicio
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
                  Hora fin
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
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Razón
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Feriado, cambio de turno..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

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
              disabled={isSubmitting}
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

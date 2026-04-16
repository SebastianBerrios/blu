import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  toLocalDateStr,
  createTimeOffRequest,
} from "@/features/horario";

interface TimeOffRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

export default function TimeOffRequestForm({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
}: TimeOffRequestFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [requestedDate, setRequestedDate] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("12:30");
  const [hoursRequested, setHoursRequested] = useState<number>(8);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setRequestedDate(toLocalDateStr(tomorrow));
      setIsFullDay(true);
      setStartTime("08:30");
      setEndTime("12:30");
      setHoursRequested(8);
      setReason("");
    }
  }, [isOpen]);

  // Auto-calculate hours for partial day
  useEffect(() => {
    if (!isFullDay && startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const diff = (eh * 60 + em - sh * 60 - sm) / 60;
      if (diff > 0) setHoursRequested(Math.round(diff * 100) / 100);
    }
  }, [isFullDay, startTime, endTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!requestedDate || hoursRequested <= 0 || !user) return;
    setIsSubmitting(true);

    try {
      await createTimeOffRequest({
        userId: user.id,
        requestedDate,
        isFullDay,
        startTime,
        endTime,
        hoursRequested,
        reason: reason || null,
      });

      toast.success("Solicitud enviada");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al solicitar permiso:", error);
      const msg = error instanceof Error ? error.message : "Error al solicitar permiso";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const insufficientBalance = hoursRequested > currentBalance;

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
            Solicitar Permiso
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
          {/* Balance info */}
          <div className="bg-primary-50 rounded-lg p-3 text-sm">
            <span className="text-slate-600">Tu saldo disponible: </span>
            <span className={`font-semibold ${currentBalance > 0 ? "text-green-700" : "text-red-600"}`}>
              {currentBalance} horas
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Fecha <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFullDay"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              disabled={isSubmitting}
              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isFullDay" className="text-sm font-medium text-slate-900">
              Día completo
            </label>
          </div>

          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">
                  Desde
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
                  Hasta
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
              Horas solicitadas <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={hoursRequested}
              onChange={(e) => setHoursRequested(Number(e.target.value))}
              disabled={isSubmitting || !isFullDay}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
            {insufficientBalance && (
              <p className="text-amber-600 text-sm mt-1">
                Tu saldo quedará en {currentBalance - hoursRequested}h. Deberás recuperar esas horas.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Razón
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Cita médica, asunto personal..."
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
              {isSubmitting ? "Enviando..." : "Solicitar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

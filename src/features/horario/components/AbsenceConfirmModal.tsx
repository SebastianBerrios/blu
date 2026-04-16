import { useState } from "react";
import { X, UserX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleSlot } from "@/types";
import { markAbsence } from "@/features/horario";
import Button from "@/components/ui/Button";

interface AbsenceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  slot: ScheduleSlot | null;
}

export default function AbsenceConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  slot,
}: AbsenceConfirmModalProps) {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen || !slot) return null;

  // Calculate hours
  const [startH, startM] = slot.start_time.slice(0, 5).split(":").map(Number);
  const [endH, endM] = slot.end_time.slice(0, 5).split(":").map(Number);
  const hours = endH + endM / 60 - (startH + startM / 60);

  const formattedDate = new Date(slot.date + "T00:00:00").toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await markAbsence({
        userId: slot.user_id,
        date: slot.date,
        startTime: slot.start_time.slice(0, 5),
        endTime: slot.end_time.slice(0, 5),
        reason: reason.trim() || undefined,
        adminId: user.id,
        adminName: profile?.full_name ?? null,
        employeeName: slot.user_name,
      });
      setReason("");
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar inasistencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Marcar Inasistencia</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Empleado</span>
              <span className="font-medium text-slate-900">{slot.user_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fecha</span>
              <span className="font-medium text-slate-900 capitalize">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Turno</span>
              <span className="font-medium text-slate-900">
                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700 font-medium">
              Se descontarán {hours.toFixed(1)} horas del acumulado
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: No se presentó"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Error */}
          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Registrando..." : "Confirmar Falta"}
          </Button>
        </div>
      </div>
    </div>
  );
}

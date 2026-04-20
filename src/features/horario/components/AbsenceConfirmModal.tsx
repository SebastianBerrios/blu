import { useEffect, useMemo, useState } from "react";
import { X, UserX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleSlot, AbsenceMode } from "@/types";
import { markAbsence } from "@/features/horario";
import Button from "@/components/ui/Button";

interface AbsenceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  slot: ScheduleSlot | null;
}

function addMinutesClamped(time: string, minutes: number, min: string, max: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const [minH, minM] = min.split(":").map(Number);
  const [maxH, maxM] = max.split(":").map(Number);
  const clamped = Math.max(minH * 60 + minM, Math.min(maxH * 60 + maxM, total));
  const hh = Math.floor(clamped / 60).toString().padStart(2, "0");
  const mm = (clamped % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function diffMinutes(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

const MODE_OPTIONS: { value: AbsenceMode; label: string }[] = [
  { value: "full", label: "Falta completa" },
  { value: "late", label: "Tardanza" },
  { value: "early", label: "Salida temprana" },
];

export default function AbsenceConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  slot,
}: AbsenceConfirmModalProps) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<AbsenceMode>("full");
  const [actualTime, setActualTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const shiftStart = slot?.start_time.slice(0, 5) ?? "";
  const shiftEnd = slot?.end_time.slice(0, 5) ?? "";

  // Reset state whenever the modal opens for a new slot.
  useEffect(() => {
    if (!isOpen || !slot) return;
    setMode("full");
    setActualTime("");
    setReason("");
    setSubmitError(null);
  }, [isOpen, slot]);

  // Default the actual-time input when switching modes.
  useEffect(() => {
    if (!slot) return;
    if (mode === "late") {
      setActualTime(addMinutesClamped(shiftStart, 15, shiftStart, shiftEnd));
    } else if (mode === "early") {
      setActualTime(addMinutesClamped(shiftEnd, -15, shiftStart, shiftEnd));
    } else {
      setActualTime("");
    }
  }, [mode, slot, shiftStart, shiftEnd]);

  const missedMinutes = useMemo(() => {
    if (!slot) return 0;
    if (mode === "full") return diffMinutes(shiftStart, shiftEnd);
    if (!actualTime) return 0;
    if (mode === "late") return Math.max(0, diffMinutes(shiftStart, actualTime));
    return Math.max(0, diffMinutes(actualTime, shiftEnd));
  }, [mode, slot, shiftStart, shiftEnd, actualTime]);

  const missedHours = missedMinutes / 60;

  const validationError = useMemo(() => {
    if (mode === "full") return null;
    if (!actualTime) return "Ingresa la hora real";
    if (actualTime <= shiftStart) return "Debe ser posterior al inicio del turno";
    if (actualTime >= shiftEnd) return "Debe ser anterior al fin del turno";
    if (missedMinutes <= 0) return "El rango es inválido";
    return null;
  }, [mode, actualTime, shiftStart, shiftEnd, missedMinutes]);

  if (!isOpen || !slot) return null;

  const formattedDate = new Date(slot.date + "T00:00:00").toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleSubmit = async () => {
    if (!user) return;
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await markAbsence({
        userId: slot.user_id,
        date: slot.date,
        shiftStart,
        shiftEnd,
        mode,
        actualTime: mode === "full" ? undefined : actualTime,
        reason: reason.trim() || undefined,
        adminId: user.id,
        adminName: profile?.full_name ?? null,
        employeeName: slot.user_name,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel =
    mode === "full" ? "Confirmar Falta" : mode === "late" ? "Registrar Tardanza" : "Registrar Salida";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Registrar incidencia</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
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
                {shiftStart} - {shiftEnd}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
            <div className="inline-flex bg-slate-100 rounded-lg p-0.5 w-full">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mode === opt.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {mode !== "full" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {mode === "late" ? "Hora de llegada" : "Hora de salida"}
              </label>
              <input
                type="time"
                value={actualTime}
                min={shiftStart}
                max={shiftEnd}
                onChange={(e) => setActualTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          <div
            className={`rounded-lg px-4 py-3 border ${
              validationError
                ? "bg-slate-50 border-slate-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {validationError ? (
              <p className="text-sm text-slate-600">{validationError}</p>
            ) : (
              <p className="text-sm text-red-700 font-medium">
                Se descontarán {missedMinutes} min ({missedHours.toFixed(2)} h) del acumulado
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                mode === "full"
                  ? "Ej: No se presentó"
                  : mode === "late"
                  ? "Ej: Tráfico"
                  : "Ej: Se retiró temprano por cita médica"
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={isSubmitting || !!validationError}
            className="flex-1"
          >
            {isSubmitting ? "Registrando..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

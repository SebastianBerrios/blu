import { useState } from "react";
import { X, Check, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { TimeOffRequestWithUser } from "@/types";
import { formatDateWithWeekdayLong } from "@/utils/helpers/dateFormatters";
import {
  approveTimeOffRequest,
  rejectTimeOffRequest,
} from "@/features/horario";

interface TimeOffReviewFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: TimeOffRequestWithUser | null;
  employeeBalance: number;
}

export default function TimeOffReviewForm({
  isOpen,
  onClose,
  onSuccess,
  request,
  employeeBalance,
}: TimeOffReviewFormProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  if (!isOpen || !request) return null;

  const insufficientBalance = employeeBalance < request.hours_requested;

  const handleApprove = async () => {
    if (!user) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await approveTimeOffRequest({
        requestId: request.id,
        adminId: user.id,
        adminName: profile?.full_name ?? null,
        employeeName: request.user_name ?? "",
        requestedDate: request.requested_date,
        hoursRequested: request.hours_requested,
        reviewNote: reviewNote || null,
      });

      toast.success("Solicitud aprobada");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al aprobar solicitud:", error);
      const msg = error instanceof Error ? error.message : "Error al aprobar solicitud";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!user) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await rejectTimeOffRequest({
        requestId: request.id,
        adminId: user.id,
        adminName: profile?.full_name ?? null,
        employeeName: request.user_name ?? "",
        requestedDate: request.requested_date,
        reviewNote: reviewNote || null,
      });

      toast.success("Solicitud rechazada");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
      const msg = error instanceof Error ? error.message : "Error al rechazar solicitud";
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
            Revisar Solicitud
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

        <div className="p-6 space-y-4">
          {/* Request details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Empleado</span>
              <span className="text-sm font-medium text-slate-900">
                {request.user_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Fecha</span>
              <span className="text-sm font-medium text-slate-900">
                {formatDateWithWeekdayLong(request.requested_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Tipo</span>
              <span className="text-sm font-medium text-slate-900">
                {request.is_full_day
                  ? "Día completo"
                  : `${request.start_time?.slice(0, 5)} - ${request.end_time?.slice(0, 5)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Horas</span>
              <span className="text-sm font-medium text-slate-900">
                {request.hours_requested}h
              </span>
            </div>
            {request.reason && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Razón</span>
                <span className="text-sm font-medium text-slate-900">
                  {request.reason}
                </span>
              </div>
            )}
          </div>

          {/* Balance info */}
          <div
            className={`rounded-lg p-3 text-sm ${
              insufficientBalance ? "bg-amber-50" : "bg-green-50"
            }`}
          >
            <span className="text-slate-600">Saldo del empleado: </span>
            <span
              className={`font-semibold ${
                insufficientBalance ? "text-amber-700" : "text-green-700"
              }`}
            >
              {employeeBalance}h
            </span>
            {insufficientBalance && (
              <p className="text-amber-600 text-xs mt-1">
                El saldo quedará en {employeeBalance - request.hours_requested}h tras aprobar
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              disabled={isSubmitting}
              placeholder="Comentario para el empleado..."
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
              onClick={handleReject}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {isSubmitting ? "..." : "Rechazar"}
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "..." : "Aprobar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

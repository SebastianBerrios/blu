import type { TimeOffRequestWithUser } from "@/types";
import { formatDateWithWeekday } from "@/utils/helpers/dateFormatters";
import { STATUS_STYLES } from "../constants";

interface RequestCardProps {
  request: TimeOffRequestWithUser;
  isAdmin: boolean;
  onReview: () => void;
}

export default function RequestCard({
  request,
  isAdmin,
  onReview,
}: RequestCardProps) {
  const statusStyle =
    STATUS_STYLES[request.status] ?? STATUS_STYLES.pendiente;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isAdmin && (
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {request.user_name}
              {request.user_role && (
                <span className="text-xs text-slate-400 font-normal ml-1">
                  ({request.user_role})
                </span>
              )}
            </p>
          )}
          <p className="text-sm text-slate-600">
            {formatDateWithWeekday(request.requested_date)}
            {request.is_full_day
              ? " — Día completo"
              : ` — ${request.start_time?.slice(0, 5)} a ${request.end_time?.slice(0, 5)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {request.hours_requested}h solicitadas
          </p>
          {request.reason && (
            <p className="text-xs text-slate-500 mt-1">
              Razón: {request.reason}
            </p>
          )}
          {request.review_note && (
            <p className="text-xs text-slate-500 mt-1 italic">
              Nota: {request.review_note}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {request.status === "pendiente"
              ? "Pendiente"
              : request.status === "aprobado"
              ? "Aprobado"
              : "Rechazado"}
          </span>
          {isAdmin && request.status === "pendiente" && (
            <button
              onClick={onReview}
              className="text-xs text-primary-600 hover:underline font-medium"
            >
              Revisar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

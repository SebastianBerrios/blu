import { useState } from "react";
import { CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import Spinner from "@/components/ui/Spinner";

interface HistoryTabProps {
  users: { id: string; full_name: string | null; role: string | null }[];
}

function getDefaultRange() {
  const now = new Date();
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return { startDate: startStr, endDate: end };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
}

export default function HistoryTab({ users }: HistoryTabProps) {
  const defaults = getDefaultRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [userId, setUserId] = useState("");

  const { summaries, isLoading } = useActivityHistory({
    startDate,
    endDate,
    userId: userId || undefined,
  });

  return (
    <div className="p-4 md:p-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex gap-2 flex-1">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="md:w-56 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
        >
          <option value="">Todos los empleados</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <Spinner text="Cargando historial..." />
      ) : summaries.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Sin datos en este rango</p>
          <p className="text-sm mt-1">Ajusta las fechas para ver el historial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map((s) => {
            const pct = s.total_tasks > 0 ? Math.round((s.completed_tasks / s.total_tasks) * 100) : 0;
            const isComplete = pct === 100;
            return (
              <div
                key={`${s.date}-${s.user_id}`}
                className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {formatDate(s.date)}
                    </span>
                    {!userId && (
                      <span className="text-xs text-slate-400">{s.user_name}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-primary-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${isComplete ? "text-green-600" : "text-slate-500"}`}>
                    {s.completed_tasks}/{s.total_tasks}
                  </span>
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

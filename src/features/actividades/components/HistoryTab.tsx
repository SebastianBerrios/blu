import { useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import Spinner from "@/components/ui/Spinner";

interface HistoryTabProps {
  users: { id: string; full_name: string | null; role: string | null }[];
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getRange(days: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return { startDate: toISODate(start), endDate: toISODate(now) };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
}

type RangePreset = "7d" | "30d" | "custom";

export default function HistoryTab({ users }: HistoryTabProps) {
  const defaults = getRange(7);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [userId, setUserId] = useState("");
  const [preset, setPreset] = useState<RangePreset>("7d");

  const { summaries, isLoading } = useActivityHistory({
    startDate,
    endDate,
    userId: userId || undefined,
  });

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p === "7d") {
      const r = getRange(7);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    } else if (p === "30d") {
      const r = getRange(30);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    }
  };

  const hasFilters = userId !== "" || preset !== "7d";
  const resetFilters = () => {
    const r = getRange(7);
    setStartDate(r.startDate);
    setEndDate(r.endDate);
    setUserId("");
    setPreset("7d");
  };

  return (
    <div className="p-4 md:p-6">
      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["7d", "30d", "custom"] as RangePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                preset === p
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {p === "7d" ? "Últimos 7 días" : p === "30d" ? "Últimos 30 días" : "Personalizado"}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Desde</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("custom");
                }}
                className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </label>
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("custom");
                }}
                className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </label>
          </div>
          <label className="md:w-56 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Empleado</span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm bg-white"
            >
              <option value="">Todos los empleados</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.id}
                </option>
              ))}
            </select>
          </label>
        </div>
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
            const isEmpty = pct === 0;
            const barColor = isComplete
              ? "bg-green-500"
              : pct >= 50
              ? "bg-primary-500"
              : "bg-amber-400";
            return (
              <div
                key={`${s.date}-${s.user_id}`}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 px-4 py-3 flex items-center gap-4 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900 capitalize">
                      {formatDate(s.date)}
                    </span>
                    {!userId && s.user_name && (
                      <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-full bg-slate-100">
                        {s.user_name}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isComplete ? "text-green-600" : "text-slate-700"
                    }`}
                  >
                    {s.completed_tasks}/{s.total_tasks}
                  </span>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      isComplete
                        ? "text-green-600"
                        : isEmpty
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="shrink-0">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-300" />
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

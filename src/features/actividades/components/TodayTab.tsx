import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import type { EmployeeTodayTasks, TodayTask, TaskCategory } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { CATEGORY_LABELS, CATEGORY_STYLES, CATEGORY_ORDER } from "../constants";
import { ROLE_COLORS } from "@/features/horario/constants";

interface TodayTabProps {
  employees: EmployeeTodayTasks[];
  isLoading: boolean;
}

export default function TodayTab({ employees, isLoading }: TodayTabProps) {
  if (isLoading) return <Spinner text="Cargando actividades..." />;

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="font-medium">Sin actividades para hoy</p>
        <p className="text-sm mt-1">No hay tareas asignadas para el día de hoy</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {employees.map((emp) => {
        const pct = emp.total_count > 0 ? Math.round((emp.completed_count / emp.total_count) * 100) : 0;
        const roleColor = ROLE_COLORS[emp.user_role] ?? ROLE_COLORS.admin;
        const isComplete = pct === 100;

        return (
          <div
            key={emp.user_id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
          >
            {/* Header */}
            <div className="px-4 md:px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-semibold text-slate-900 truncate">{emp.user_name}</span>
                <span
                  className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${roleColor.bg} ${roleColor.text}`}
                >
                  {emp.user_role}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    isComplete ? "text-green-600" : "text-slate-700"
                  }`}
                >
                  {emp.completed_count}/{emp.total_count}
                </span>
                <span
                  className={`text-xs font-medium tabular-nums ${
                    isComplete ? "text-green-600" : "text-slate-400"
                  }`}
                >
                  {pct}%
                </span>
                {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-100">
              <div
                className={`h-full transition-all duration-500 ${
                  isComplete ? "bg-green-500" : "bg-primary-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Tasks by category */}
            <div className="px-4 md:px-5 py-4 space-y-4">
              {CATEGORY_ORDER.map((cat) => {
                const catTasks = emp.tasks.filter((t) => t.category === cat);
                if (catTasks.length === 0) return null;
                const style = CATEGORY_STYLES[cat as TaskCategory];
                const catCompleted = catTasks.filter((t) => t.is_completed).length;
                const catPct = Math.round((catCompleted / catTasks.length) * 100);
                const catComplete = catPct === 100;

                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {CATEGORY_LABELS[cat as TaskCategory]}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {catCompleted}/{catTasks.length}
                        </span>
                      </div>
                      {catComplete && (
                        <span className="text-[11px] font-medium text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completa
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {catTasks.map((task: TodayTask) => (
                        <li key={task.id} className="flex items-center gap-2.5 py-1">
                          {task.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              task.is_completed
                                ? "text-slate-400 line-through"
                                : "text-slate-700"
                            }`}
                          >
                            {task.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

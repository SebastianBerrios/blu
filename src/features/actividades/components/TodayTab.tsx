import { CheckCircle2, ClipboardList } from "lucide-react";
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

        return (
          <div key={emp.user_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{emp.user_name}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleColor.bg} ${roleColor.text}`}>
                  {emp.user_role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${pct === 100 ? "text-green-600" : "text-slate-500"}`}>
                  {emp.completed_count}/{emp.total_count}
                </span>
                {pct === 100 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-100">
              <div
                className={`h-full transition-all duration-300 ${pct === 100 ? "bg-green-500" : "bg-primary-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Tasks by category */}
            <div className="px-4 py-3 space-y-2">
              {CATEGORY_ORDER.map((cat) => {
                const catTasks = emp.tasks.filter((t) => t.category === cat);
                if (catTasks.length === 0) return null;
                const style = CATEGORY_STYLES[cat as TaskCategory];
                const catCompleted = catTasks.filter((t) => t.is_completed).length;

                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-semibold ${style.text}`}>
                        {CATEGORY_LABELS[cat as TaskCategory]}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {catCompleted}/{catTasks.length}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {catTasks.map((task: TodayTask) => (
                        <div key={task.id} className="flex items-center gap-2 py-0.5">
                          {task.is_completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                          )}
                          <span className={`text-xs ${task.is_completed ? "text-slate-400 line-through" : "text-slate-600"}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
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

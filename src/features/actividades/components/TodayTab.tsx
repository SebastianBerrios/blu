import { CheckCircle2, Circle, ClipboardList, Users } from "lucide-react";
import type { EmployeeTodayTasks, TodayTask } from "@/types";
import Spinner from "@/components/ui/Spinner";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  CATEGORY_ORDER,
  ON_DEMAND_LABEL,
  ON_DEMAND_STYLE,
  frequencyLabel,
} from "../constants";
import { ROLE_COLORS } from "@/features/horario/constants";

interface TodayTabProps {
  employees: EmployeeTodayTasks[];
  isLoading: boolean;
}

interface Section {
  key: string;
  label: string;
  style: { bg: string; text: string; border: string };
  tasks: TodayTask[];
  onDemand: boolean;
}

function buildSections(tasks: TodayTask[]): Section[] {
  return [
    ...CATEGORY_ORDER.map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      style: CATEGORY_STYLES[cat],
      tasks: tasks.filter((t) => t.category === cat && t.frequency !== "on_demand"),
      onDemand: false,
    })),
    {
      key: "on_demand",
      label: ON_DEMAND_LABEL,
      style: ON_DEMAND_STYLE,
      tasks: tasks.filter((t) => t.frequency === "on_demand"),
      onDemand: true,
    },
  ].filter((s) => s.tasks.length > 0);
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
        const pct = emp.total_count > 0 ? Math.round((emp.completed_count / emp.total_count) * 100) : 100;
        const roleColor = ROLE_COLORS[emp.user_role] ?? ROLE_COLORS.admin;
        const isComplete = pct === 100;
        const sections = buildSections(emp.tasks);

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
                    isComplete ? "text-green-600" : "text-slate-500"
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

            {/* Tasks by section */}
            <div className="px-4 md:px-5 py-4 space-y-4">
              {sections.map(({ key, label, style, tasks: catTasks }) => {
                const catCompleted = catTasks.filter((t) => t.is_completed).length;
                const catComplete = catCompleted === catTasks.length;

                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {label}
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
                    <ul className="space-y-1.5">
                      {catTasks.map((task) => {
                        const showFreq = task.frequency === "weekly" || task.frequency === "interval";
                        return (
                          <li key={task.id} className="flex items-start gap-2.5 py-1">
                            <span className="pt-0.5 shrink-0">
                              {task.is_completed ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-300" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm ${
                                    task.is_completed ? "text-slate-400 line-through" : "text-slate-700"
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {showFreq && (
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                    {frequencyLabel(task)}
                                  </span>
                                )}
                                {task.shared && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-full"
                                    title="Actividad compartida"
                                  >
                                    <Users className="w-2.5 h-2.5" />
                                    Compartida
                                  </span>
                                )}
                              </span>
                              {task.description && (
                                <span className="block text-xs text-slate-500 mt-0.5">{task.description}</span>
                              )}
                            </span>
                          </li>
                        );
                      })}
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

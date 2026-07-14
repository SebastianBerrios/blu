import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Users } from "lucide-react";
import type { TodayTask } from "@/types";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  CATEGORY_ORDER,
  ON_DEMAND_LABEL,
  ON_DEMAND_STYLE,
  frequencyLabel,
} from "../constants";

interface EmployeeTaskListProps {
  tasks: TodayTask[];
  onToggle: (task: TodayTask) => Promise<void>;
  readOnly?: boolean;
}

interface Section {
  key: string;
  label: string;
  style: { bg: string; text: string; border: string };
  tasks: TodayTask[];
  onDemand: boolean;
}

export default function EmployeeTaskList({ tasks, onToggle, readOnly }: EmployeeTaskListProps) {
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const sections: Section[] = [
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

  const handleToggle = async (task: TodayTask) => {
    if (readOnly || togglingId !== null) return;
    setTogglingId(task.id);
    try {
      await onToggle(task);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, style, tasks: catTasks, onDemand }) => {
        const completed = catTasks.filter((t) => t.is_completed).length;
        const pct = Math.round((completed / catTasks.length) * 100);
        const isComplete = pct === 100;

        return (
          <div
            key={key}
            className={`rounded-xl border ${style.border} overflow-hidden bg-white shadow-sm`}
          >
            <div className={`px-4 py-3 ${style.bg} flex items-center justify-between gap-3`}>
              <span className={`text-sm font-semibold ${style.text}`}>{label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium tabular-nums ${style.text}`}>
                  {completed}/{catTasks.length}
                </span>
                {isComplete && <CheckCircle2 className={`w-4 h-4 ${style.text}`} />}
              </div>
            </div>
            {!onDemand && (
              <div className="h-1.5 bg-slate-100">
                <div
                  className={`h-full transition-all duration-500 ${
                    isComplete ? "bg-green-500" : "bg-primary-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <ul className="divide-y divide-slate-100">
              {catTasks.map((task) => {
                const isToggling = togglingId === task.id;
                const showFreq = task.frequency === "weekly" || task.frequency === "interval";
                return (
                  <li key={task.id}>
                    <button
                      onClick={() => handleToggle(task)}
                      disabled={readOnly || isToggling}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <span className="pt-0.5 shrink-0">
                        {isToggling ? (
                          <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                        ) : task.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm ${
                              task.is_completed ? "text-slate-400 line-through" : "text-slate-800 font-medium"
                            }`}
                          >
                            {task.title}
                          </span>
                          {showFreq && (
                            <span className="shrink-0 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {frequencyLabel(task)}
                            </span>
                          )}
                          {task.shared && (
                            <span
                              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full"
                              title="Actividad compartida con otras personas"
                            >
                              <Users className="w-3 h-3" />
                              Compartida
                            </span>
                          )}
                        </span>
                        {task.description && (
                          <span
                            className={`block text-xs mt-0.5 ${
                              task.is_completed ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {task.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

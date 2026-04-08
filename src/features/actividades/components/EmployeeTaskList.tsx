import { useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { TodayTask, TaskCategory } from "@/types";
import { CATEGORY_LABELS, CATEGORY_STYLES, CATEGORY_ORDER } from "../constants";

interface EmployeeTaskListProps {
  tasks: TodayTask[];
  onToggle: (task: TodayTask) => Promise<void>;
  readOnly?: boolean;
}

export default function EmployeeTaskList({ tasks, onToggle, readOnly }: EmployeeTaskListProps) {
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    tasks: tasks.filter((t) => t.category === cat),
  })).filter((g) => g.tasks.length > 0);

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
      {grouped.map(({ category, tasks: catTasks }) => {
        const style = CATEGORY_STYLES[category as TaskCategory];
        const completed = catTasks.filter((t) => t.is_completed).length;

        return (
          <div key={category} className={`rounded-xl border ${style.border} overflow-hidden`}>
            <div className={`px-4 py-2.5 ${style.bg} flex items-center justify-between`}>
              <span className={`text-sm font-semibold ${style.text}`}>
                {CATEGORY_LABELS[category as TaskCategory]}
              </span>
              <span className={`text-xs font-medium ${style.text}`}>
                {completed}/{catTasks.length} completadas
              </span>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {catTasks.map((task) => {
                const isToggling = togglingId === task.id;
                return (
                  <button
                    key={task.id}
                    onClick={() => handleToggle(task)}
                    disabled={readOnly || isToggling}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isToggling ? (
                      <Loader2 className="w-5 h-5 text-primary-500 animate-spin shrink-0" />
                    ) : task.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 shrink-0" />
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
                    {task.frequency === "weekly" && (
                      <span className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        Semanal
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

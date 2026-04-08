import { useState, useMemo } from "react";
import { Pencil, Trash2, ClipboardList, Plus } from "lucide-react";
import type { EmployeeTaskWithUser, TaskCategory } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { CATEGORY_LABELS, CATEGORY_STYLES, CATEGORY_ORDER, DAY_LABELS_SHORT, FREQUENCY_LABELS } from "../constants";

interface ManagementTabProps {
  tasks: EmployeeTaskWithUser[];
  users: { id: string; full_name: string | null; role: string | null }[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (task: EmployeeTaskWithUser) => void;
  onDelete: (task: EmployeeTaskWithUser) => void;
}

export default function ManagementTab({
  tasks,
  users,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: ManagementTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const filteredTasks = useMemo(() => {
    const filtered = selectedUserId ? tasks.filter((t) => t.user_id === selectedUserId) : tasks;
    return [...filtered].sort((a, b) => {
      // Sort by user name, then category order, then sort_order
      const nameA = a.user_name ?? "";
      const nameB = b.user_name ?? "";
      if (nameA !== nameB) return nameA.localeCompare(nameB, "es");
      const catA = CATEGORY_ORDER.indexOf(a.category as TaskCategory);
      const catB = CATEGORY_ORDER.indexOf(b.category as TaskCategory);
      if (catA !== catB) return catA - catB;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [tasks, selectedUserId]);

  if (isLoading) return <Spinner text="Cargando tareas..." />;

  return (
    <div className="p-4 md:p-6">
      {/* Filter by employee + desktop add button */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full md:w-64 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
        >
          <option value="">Todos los empleados</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id} ({u.role})
            </option>
          ))}
        </select>
        <button
          onClick={onAdd}
          className="hidden md:flex items-center gap-1.5 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agregar tarea
        </button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Sin tareas definidas</p>
          <p className="text-sm mt-1">Agrega tareas usando el botón +</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const style = CATEGORY_STYLES[task.category as TaskCategory];
            return (
              <div
                key={task.id}
                className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900">{task.title}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                      {CATEGORY_LABELS[task.category as TaskCategory]}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {FREQUENCY_LABELS[task.frequency]}
                    </span>
                    {task.frequency === "weekly" && task.days_of_week && (
                      <span className="text-[10px] text-slate-400">
                        {task.days_of_week.map((d) => DAY_LABELS_SHORT[d]).join(", ")}
                      </span>
                    )}
                  </div>
                  {!selectedUserId && (
                    <p className="text-xs text-slate-400 mt-0.5">{task.user_name}</p>
                  )}
                </div>
                <button
                  onClick={() => onEdit(task)}
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(task)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

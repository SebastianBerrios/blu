import { useState, useMemo } from "react";
import { Pencil, Trash2, ClipboardList, Plus, X, Search, Users } from "lucide-react";
import type { ActivityWithAssignees, TaskCategory } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { normalizeText } from "@/utils/helpers";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  CATEGORY_ORDER,
  frequencyLabel,
} from "../constants";

interface ManagementTabProps {
  catalog: ActivityWithAssignees[];
  users: { id: string; full_name: string | null; role: string | null }[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (activity: ActivityWithAssignees) => void;
  onDelete: (activity: ActivityWithAssignees) => void;
}

export default function ManagementTab({
  catalog,
  users,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: ManagementTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<"" | TaskCategory>("");
  const [query, setQuery] = useState<string>("");

  const hasFilters = !!selectedUserId || !!selectedCategory || query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return catalog.filter((a) => {
      if (selectedUserId && !a.assignees.some((x) => x.id === selectedUserId)) return false;
      if (selectedCategory && a.category !== selectedCategory) return false;
      if (q && !normalizeText(a.title).includes(q)) return false;
      return true;
    });
  }, [catalog, selectedUserId, selectedCategory, query]);

  const resetFilters = () => {
    setSelectedUserId("");
    setSelectedCategory("");
    setQuery("");
  };

  if (isLoading) return <Spinner text="Cargando actividades..." />;

  const hasActivities = catalog.length > 0;

  return (
    <div className="p-4 md:p-6">
      {/* Filter bar */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar actividad..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="md:w-56 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm bg-white"
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
            className="hidden md:inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar actividad
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              selectedCategory === ""
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            Todas
          </button>
          {CATEGORY_ORDER.map((cat) => {
            const style = CATEGORY_STYLES[cat];
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? `${style.bg} ${style.text} ${style.border}`
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
          {hasFilters && (
            <>
              <span className="text-xs text-slate-500 ml-1">
                {filtered.length} de {catalog.length}
              </span>
              <button
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          {!hasActivities ? (
            <>
              <p className="font-medium">Sin actividades definidas</p>
              <p className="text-sm mt-1">Agrega actividades usando el botón +</p>
            </>
          ) : (
            <>
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm mt-1">Ajusta o limpia los filtros para ver más actividades</p>
              <button
                onClick={resetFilters}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((activity) => {
            const style = CATEGORY_STYLES[activity.category as TaskCategory];
            const shared = activity.assignees.length > 1;
            return (
              <div
                key={activity.id}
                className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 px-4 py-3 flex items-start gap-3 transition-colors"
              >
                <span
                  className={`shrink-0 w-1 self-stretch rounded-full ${
                    activity.category === "apertura"
                      ? "bg-amber-400"
                      : activity.category === "jornada"
                      ? "bg-sky-400"
                      : "bg-purple-400"
                  }`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900">{activity.title}</span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {CATEGORY_LABELS[activity.category as TaskCategory]}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {frequencyLabel(activity)}
                    </span>
                    {shared && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                        <Users className="w-3 h-3" />
                        Compartida ({activity.assignees.length})
                      </span>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-xs text-slate-500 mt-1">{activity.description}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {activity.assignees.length > 0
                      ? activity.assignees.map((a) => a.name).join(", ")
                      : "Sin asignar"}
                  </p>
                </div>
                <button
                  onClick={() => onEdit(activity)}
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors shrink-0"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(activity)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Eliminar"
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

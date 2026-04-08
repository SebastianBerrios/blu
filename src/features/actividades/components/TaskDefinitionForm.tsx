import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { EmployeeTaskWithUser, TaskCategory, TaskFrequency } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER, DAY_LABELS_SHORT } from "../constants";

interface TaskDefinitionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: { id: string; full_name: string | null; role: string | null }[];
  item?: EmployeeTaskWithUser;
  onSubmit: (data: {
    user_id: string;
    title: string;
    category: TaskCategory;
    frequency: TaskFrequency;
    days_of_week: number[] | null;
    sort_order: number;
  }) => Promise<void>;
}

export default function TaskDefinitionForm({
  isOpen,
  onClose,
  onSuccess,
  users,
  item,
  onSubmit,
}: TaskDefinitionFormProps) {
  const isEditMode = !!item;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("apertura");
  const [frequency, setFrequency] = useState<TaskFrequency>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setUserId(item.user_id);
        setTitle(item.title);
        setCategory(item.category as TaskCategory);
        setFrequency(item.frequency as TaskFrequency);
        setDaysOfWeek(item.days_of_week ?? []);
        setSortOrder(item.sort_order ?? 0);
      } else {
        setUserId(users[0]?.id ?? "");
        setTitle("");
        setCategory("apertura");
        setFrequency("daily");
        setDaysOfWeek([]);
        setSortOrder(0);
      }
      setSubmitError(null);
    }
  }, [isOpen, item, users]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!userId || !title.trim()) return;
    if (frequency === "weekly" && daysOfWeek.length === 0) {
      setSubmitError("Selecciona al menos un día para tareas semanales");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        user_id: userId,
        title: title.trim(),
        category,
        frequency,
        days_of_week: frequency === "weekly" ? daysOfWeek : null,
        sort_order: sortOrder,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar tarea:", error);
      setSubmitError(error instanceof Error ? error.message : "Error al guardar tarea");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900">
            {isEditMode ? "Editar Tarea" : "Nueva Tarea"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Empleado <span className="text-red-600">*</span>
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isSubmitting || isEditMode}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.id} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Título <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Limpiar máquina de café"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Categoría <span className="text-red-600">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              {CATEGORY_ORDER.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Frecuencia <span className="text-red-600">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as TaskFrequency)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
            </select>
          </div>

          {frequency === "weekly" && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Días de la semana <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {DAY_LABELS_SHORT.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    disabled={isSubmitting}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      daysOfWeek.includes(idx)
                        ? "bg-primary-500 text-white border-primary-500"
                        : "bg-white text-slate-600 border-slate-300 hover:border-primary-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Orden
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              disabled={isSubmitting}
              min={0}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { ActivityWithAssignees, CreateActivity, TaskCategory, TaskFrequency } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../constants";
import WeeklyDaysField from "./fields/WeeklyDaysField";
import IntervalFrequencyField from "./fields/IntervalFrequencyField";
import AssigneesField from "./fields/AssigneesField";
import FormActions from "./fields/FormActions";

interface ActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: { id: string; full_name: string | null; role: string | null }[];
  item?: ActivityWithAssignees;
  onSubmit: (data: CreateActivity) => Promise<void>;
}

const FREQUENCY_OPTIONS: { value: TaskFrequency; label: string }[] = [
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Días fijos" },
  { value: "interval", label: "Cada N días" },
  { value: "on_demand", label: "Según necesidad" },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ActivityForm({
  isOpen,
  onClose,
  onSuccess,
  users,
  item,
  onSubmit,
}: ActivityFormProps) {
  const isEditMode = !!item;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("apertura");
  const [frequency, setFrequency] = useState<TaskFrequency>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState<number>(2);
  const [anchorDate, setAnchorDate] = useState<string>(todayISO());
  const [sortOrder, setSortOrder] = useState(0);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setCategory(item.category as TaskCategory);
      setFrequency(item.frequency as TaskFrequency);
      setDaysOfWeek(item.days_of_week ?? []);
      setIntervalDays(item.interval_days ?? 2);
      setAnchorDate(item.anchor_date ?? todayISO());
      setSortOrder(item.sort_order ?? 0);
      setAssigneeIds(item.assignees.map((a) => a.id));
    } else {
      setTitle("");
      setDescription("");
      setCategory("apertura");
      setFrequency("daily");
      setDaysOfWeek([]);
      setIntervalDays(2);
      setAnchorDate(todayISO());
      setSortOrder(0);
      setAssigneeIds([]);
    }
    setSubmitError(null);
  }, [isOpen, item]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError("El título es obligatorio");
      return;
    }
    if (assigneeIds.length === 0) {
      setSubmitError("Asigna la actividad a al menos una persona");
      return;
    }
    if (frequency === "weekly" && daysOfWeek.length === 0) {
      setSubmitError("Selecciona al menos un día");
      return;
    }
    if (frequency === "interval" && (!intervalDays || intervalDays < 1)) {
      setSubmitError("El intervalo debe ser de al menos 1 día");
      return;
    }
    if (frequency === "interval" && !anchorDate) {
      setSubmitError("Selecciona una fecha de referencia");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        category,
        frequency,
        days_of_week: frequency === "weekly" ? daysOfWeek : null,
        interval_days: frequency === "interval" ? intervalDays : null,
        anchor_date: frequency === "interval" ? anchorDate : null,
        sort_order: sortOrder,
        assignee_ids: assigneeIds,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar actividad:", error);
      setSubmitError(error instanceof Error ? error.message : "Error al guardar actividad");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900">
            {isEditMode ? "Editar Actividad" : "Nueva Actividad"}
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
              Título <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Limpiar máquina de café"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              placeholder="Instrucciones breves para que no quede nada al aire"
              className={inputClass + " resize-none"}
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
              className={inputClass}
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
              className={inputClass}
            >
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {frequency === "weekly" && (
            <WeeklyDaysField
              daysOfWeek={daysOfWeek}
              onToggleDay={toggleDay}
              isSubmitting={isSubmitting}
            />
          )}

          {frequency === "interval" && (
            <IntervalFrequencyField
              intervalDays={intervalDays}
              anchorDate={anchorDate}
              onIntervalDaysChange={setIntervalDays}
              onAnchorDateChange={setAnchorDate}
              isSubmitting={isSubmitting}
              inputClass={inputClass}
            />
          )}

          <AssigneesField
            users={users}
            assigneeIds={assigneeIds}
            onToggleAssignee={toggleAssignee}
            isSubmitting={isSubmitting}
          />

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">Orden</label>
            <input
              type="number"
              inputMode="numeric"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              disabled={isSubmitting}
              min={0}
              className={inputClass}
            />
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <FormActions onClose={onClose} isSubmitting={isSubmitting} isEditMode={isEditMode} />
        </form>
      </div>
    </div>
  );
}

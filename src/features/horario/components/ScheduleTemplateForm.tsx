import { useState, useEffect } from "react";
import { X, Check, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DAY_LABELS } from "@/types/schedule";
import type { ScheduleTemplate, ScheduleUser, DayOfWeek } from "@/types";
import {
  getExistingTemplates,
  deleteTemplatesForDays,
  createTemplates,
  updateTemplate,
} from "@/features/horario";

interface ScheduleTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: ScheduleTemplate;
  users: ScheduleUser[];
}

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const ALL_USERS_VALUE = "__all__";

export default function ScheduleTemplateForm({
  isOpen,
  onClose,
  onSuccess,
  item,
  users,
}: ScheduleTemplateFormProps) {
  const isEditMode = !!item;
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form fields
  const [userId, setUserId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(0);
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(new Set());
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("12:30");

  // Conflict state (create mode only)
  const [conflictingDays, setConflictingDays] = useState<DayOfWeek[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  // For "all users" conflict tracking: map of user name -> conflicting days
  const [conflictsByUser, setConflictsByUser] = useState<Map<string, DayOfWeek[]>>(new Map());

  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setConflictingDays([]);
      setShowConflictWarning(false);
      if (item) {
        setUserId(item.user_id);
        setDayOfWeek(item.day_of_week as DayOfWeek);
        setStartTime(item.start_time.slice(0, 5));
        setEndTime(item.end_time.slice(0, 5));
      } else {
        setUserId(users[0]?.id ?? "");
        setSelectedDays(new Set());
        setStartTime("08:30");
        setEndTime("12:30");
      }
    }
  }, [isOpen, item, users]);

  if (!isOpen) return null;

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
    setShowConflictWarning(false);
    setConflictingDays([]);
  };

  const handleUserChange = (newUserId: string) => {
    setUserId(newUserId);
    setShowConflictWarning(false);
    setConflictingDays([]);
  };

  const isAllUsers = userId === ALL_USERS_VALUE;
  const selectedUser = users.find((u) => u.id === userId);
  const employeeName = isAllUsers ? "Todos los trabajadores" : (selectedUser?.full_name ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!userId) return;

    const targetUsers = isAllUsers ? users : [users.find((u) => u.id === userId)!];

    if (isEditMode) {
      setIsSubmitting(true);
      try {
        await updateTemplate({
          templateId: item.id,
          userId,
          dayOfWeek,
          startTime,
          endTime,
          adminId: user?.id ?? null,
          adminName: profile?.full_name ?? null,
          employeeName,
        });
        onSuccess();
        onClose();
      } catch (err) {
        console.error("Error al guardar horario:", err);
        setSubmitError(err instanceof Error ? err.message : "Error al guardar horario");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Create mode
    const days = Array.from(selectedDays).sort();
    if (days.length === 0) return;

    // If conflict warning is already shown, proceed with replace
    if (showConflictWarning) {
      setIsSubmitting(true);
      try {
        for (const targetUser of targetUsers) {
          const userConflicts = isAllUsers
            ? (conflictsByUser.get(targetUser.full_name ?? targetUser.id) ?? [])
            : conflictingDays;
          if (userConflicts.length > 0) {
            await deleteTemplatesForDays(targetUser.id, userConflicts, user?.id ?? null, profile?.full_name ?? null, targetUser.full_name ?? "");
          }
          await createTemplates({
            userId: targetUser.id,
            days,
            startTime,
            endTime,
            adminId: user?.id ?? null,
            adminName: profile?.full_name ?? null,
            employeeName: targetUser.full_name ?? "",
          });
        }
        onSuccess();
        onClose();
      } catch (err) {
        console.error("Error al guardar horario:", err);
        setSubmitError(err instanceof Error ? err.message : "Error al guardar horario");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // First click: check for conflicts
    setIsCheckingConflicts(true);
    try {
      let hasAnyConflict = false;
      const newConflictsByUser = new Map<string, DayOfWeek[]>();

      for (const targetUser of targetUsers) {
        const existing = await getExistingTemplates(targetUser.id, days);
        const conflicts = existing.map((t) => t.day_of_week as DayOfWeek);
        if (conflicts.length > 0) {
          hasAnyConflict = true;
          newConflictsByUser.set(targetUser.full_name ?? targetUser.id, conflicts);
          if (!isAllUsers) setConflictingDays(conflicts);
        }
      }

      if (hasAnyConflict) {
        setConflictsByUser(newConflictsByUser);
        setShowConflictWarning(true);
      } else {
        // No conflicts, create directly
        setIsSubmitting(true);
        for (const targetUser of targetUsers) {
          await createTemplates({
            userId: targetUser.id,
            days,
            startTime,
            endTime,
            adminId: user?.id ?? null,
            adminName: profile?.full_name ?? null,
            employeeName: targetUser.full_name ?? "",
          });
        }
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Error al guardar horario:", err);
      setSubmitError(err instanceof Error ? err.message : "Error al guardar horario");
    } finally {
      setIsCheckingConflicts(false);
      setIsSubmitting(false);
    }
  };

  const isProcessing = isSubmitting || isCheckingConflicts;
  const createDisabled = !isEditMode && selectedDays.size === 0;

  const getButtonLabel = () => {
    if (isProcessing) return isCheckingConflicts ? "Verificando..." : "Guardando...";
    if (isEditMode) return "Actualizar";
    if (showConflictWarning) return "Reemplazar";
    return "Guardar";
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
            {isEditMode ? "Editar Turno" : "Agregar Turno"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee select */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Empleado <span className="text-red-600">*</span>
            </label>
            <select
              value={userId}
              onChange={(e) => handleUserChange(e.target.value)}
              disabled={isProcessing}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              {!isEditMode && (
                <option value={ALL_USERS_VALUE}>Todos los trabajadores</option>
              )}
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.id} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Day selection */}
          {isEditMode ? (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Día <span className="text-red-600">*</span>
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeek)}
                disabled={isProcessing}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              >
                {ALL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Días <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ALL_DAYS.map((day) => {
                  const isSelected = selectedDays.has(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      disabled={isProcessing}
                      className={`
                        relative flex items-center justify-center gap-1.5 px-3 py-2.5
                        rounded-lg text-sm font-medium transition-all
                        ${
                          isSelected
                            ? "bg-primary-50 text-primary-800 border-2 border-primary-500 shadow-sm"
                            : "bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      {DAY_LABELS[day]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Hora inicio <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Hora fin <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Conflict warning */}
          {showConflictWarning && (
            <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-300 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                {isAllUsers ? (
                  <>
                    <p className="font-medium text-amber-800">
                      Conflictos encontrados:
                    </p>
                    <ul className="text-amber-700 mt-0.5 space-y-0.5">
                      {Array.from(conflictsByUser.entries()).map(([name, days]) => (
                        <li key={name}>
                          {name}: {days.map((d) => DAY_LABELS[d]).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-amber-800">
                      {employeeName} ya tiene turno en:
                    </p>
                    <p className="text-amber-700 mt-0.5">
                      {conflictingDays.map((d) => DAY_LABELS[d]).join(", ")}
                    </p>
                  </>
                )}
                <p className="text-amber-600 mt-1">
                  Al continuar se reemplazarán los turnos existentes.
                </p>
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || createDisabled}
              className={`flex-1 px-4 py-3 min-h-[44px] font-medium rounded-lg transition-colors disabled:opacity-50 ${
                showConflictWarning
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-primary-900 text-white hover:bg-primary-700"
              }`}
            >
              {getButtonLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

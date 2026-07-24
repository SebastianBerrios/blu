import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleTemplate, ScheduleUser, DayOfWeek } from "@/types";
import {
  getExistingTemplates,
  deleteTemplatesForDays,
  createTemplates,
  updateTemplate,
} from "@/features/horario";
import DaySelectionField from "./ScheduleTemplateFormParts/DaySelectionField";
import TimeRangeFields from "./ScheduleTemplateFormParts/TimeRangeFields";
import ConflictWarning from "./ScheduleTemplateFormParts/ConflictWarning";

interface ScheduleTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: ScheduleTemplate;
  users: ScheduleUser[];
}

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
          <DaySelectionField
            isEditMode={isEditMode}
            dayOfWeek={dayOfWeek}
            onDayOfWeekChange={setDayOfWeek}
            selectedDays={selectedDays}
            onToggleDay={toggleDay}
            disabled={isProcessing}
          />

          {/* Time inputs */}
          <TimeRangeFields
            startTime={startTime}
            onStartTimeChange={setStartTime}
            endTime={endTime}
            onEndTimeChange={setEndTime}
            disabled={isProcessing}
          />

          {/* Conflict warning */}
          {showConflictWarning && (
            <ConflictWarning
              isAllUsers={isAllUsers}
              conflictsByUser={conflictsByUser}
              employeeName={employeeName}
              conflictingDays={conflictingDays}
            />
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

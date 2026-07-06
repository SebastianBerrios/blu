"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { useSchedule, getMonday } from "@/hooks/useSchedule";
import { useMonthSchedule, type MonthParams } from "@/hooks/useMonthSchedule";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { useExtraHours } from "@/hooks/useExtraHours";
import type { ScheduleTemplate, ScheduleSlot, TimeOffRequestWithUser } from "@/types";
import type { ViewMode } from "@/features/horario/components/ScheduleTab";
import type { TabId } from "@/features/horario/components/ScheduleTabsNav";
import { deleteTemplate, deleteExtraShift } from "@/features/horario";

export function useHorarioPage() {
  const { user, isAdmin, profile } = useAuth();
  const confirm = useConfirm();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>("horario");

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => getMonday());

  // Month navigation
  const [monthYear, setMonthYear] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Override default date (for monthly calendar clicks)
  const [overrideDefaultDate, setOverrideDefaultDate] = useState<string | undefined>();

  // Modal states
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | undefined>();
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [showExtraHoursForm, setShowExtraHoursForm] = useState(false);
  const [showExtraShiftForm, setShowExtraShiftForm] = useState(false);
  const [editingExtraShift, setEditingExtraShift] = useState<ScheduleSlot | undefined>();
  const [reviewingRequest, setReviewingRequest] = useState<TimeOffRequestWithUser | null>(null);
  const [absenceSlot, setAbsenceSlot] = useState<ScheduleSlot | null>(null);

  // Weekly schedule data (null key when not in weekly view)
  const {
    slots,
    templates,
    users,
    isLoading: scheduleLoading,
    mutate: mutateSchedule,
  } = useSchedule(viewMode === "weekly" ? weekStart : null);

  // Monthly schedule data (null key when not in monthly view)
  const monthParams: MonthParams | null = viewMode === "monthly" ? monthYear : null;
  const {
    slots: monthSlots,
    gridDates: monthGridDates,
    users: monthUsers,
    isLoading: monthLoading,
    mutate: mutateMonthSchedule,
  } = useMonthSchedule(monthParams);

  // Time off requests
  const {
    requests,
    isLoading: requestsLoading,
    mutate: mutateRequests,
  } = useTimeOffRequests();

  // Extra hours
  const {
    entries: extraHoursEntries,
    balances,
    isLoading: hoursLoading,
    mutate: mutateHours,
  } = useExtraHours();

  // Derived state
  const activeUsers = viewMode === "weekly" ? users : monthUsers;

  const myBalance = useMemo(() => {
    if (!user) return 0;
    const b = balances.find((b) => b.user_id === user.id);
    return b?.balance ?? 0;
  }, [balances, user]);

  const getEmployeeBalance = (userId: string) => {
    const b = balances.find((b) => b.user_id === userId);
    return b?.balance ?? 0;
  };

  const pendingCount = requests.filter((r) => r.status === "pendiente").length;

  // Handlers
  const handleSuccess = useCallback(() => {
    mutateSchedule();
    mutateMonthSchedule();
    mutateRequests();
    mutateHours();
  }, [mutateSchedule, mutateMonthSchedule, mutateRequests, mutateHours]);

  const handleDeleteTemplate = useCallback(async (templateId: number) => {
    try {
      await deleteTemplate(templateId, user?.id ?? null, profile?.full_name ?? null);
      mutateSchedule();
      mutateMonthSchedule();
      toast.success("Turno eliminado");
    } catch (err) {
      console.error("Error al eliminar turno:", err);
      toast.error(err instanceof Error ? err.message : "Error al eliminar turno");
    }
  }, [user, profile, mutateSchedule, mutateMonthSchedule]);

  const handleEditExtraShift = useCallback((slot: ScheduleSlot) => {
    setEditingExtraShift(slot);
    setShowExtraShiftForm(true);
  }, []);

  const handleDeleteExtraShift = useCallback(async (slot: ScheduleSlot) => {
    if (!slot.override_id || !user) return;
    const ok = await confirm({
      title: "¿Eliminar turno extra?",
      description: `Turno extra de ${slot.user_name} (${slot.date}).`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteExtraShift({
        overrideId: slot.override_id,
        adminId: user.id,
        adminName: profile?.full_name ?? null,
        employeeName: slot.user_name,
        date: slot.date,
      });
      handleSuccess();
      toast.success("Turno extra eliminado");
    } catch (err) {
      console.error("Error al eliminar turno extra:", err);
      toast.error(err instanceof Error ? err.message : "Error al eliminar turno extra");
    }
  }, [user, profile, confirm, handleSuccess]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (mode === "monthly") {
      const d = new Date(weekStart + "T00:00:00");
      setMonthYear({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const firstOfMonth = new Date(monthYear.year, monthYear.month, 1);
      setWeekStart(getMonday(firstOfMonth));
    }
    setViewMode(mode);
  }, [weekStart, monthYear]);

  const handleDayClick = useCallback((date: string) => {
    setOverrideDefaultDate(date);
    setShowOverrideForm(true);
  }, []);

  const handleOverrideClose = useCallback(() => {
    setShowOverrideForm(false);
    setOverrideDefaultDate(undefined);
  }, []);

  // Template modal helpers
  const openAddTemplate = useCallback(() => {
    setEditingTemplate(undefined);
    setShowTemplateForm(true);
  }, []);

  const openEditTemplate = useCallback((t: ScheduleTemplate) => {
    setEditingTemplate(t);
    setShowTemplateForm(true);
  }, []);

  const openAddExtraShift = useCallback(() => {
    setEditingExtraShift(undefined);
    setShowExtraShiftForm(true);
  }, []);

  return {
    // Auth
    user,
    isAdmin,
    // Tab
    activeTab,
    setActiveTab,
    pendingCount,
    // View/navigation
    viewMode,
    weekStart,
    setWeekStart,
    monthYear,
    setMonthYear,
    overrideDefaultDate,
    // Schedule data
    slots,
    templates,
    scheduleLoading,
    monthSlots,
    monthGridDates,
    monthLoading,
    activeUsers,
    // Requests
    requests,
    requestsLoading,
    // Extra hours
    extraHoursEntries,
    balances,
    hoursLoading,
    myBalance,
    getEmployeeBalance,
    // Modal states
    showTemplateForm,
    setShowTemplateForm,
    editingTemplate,
    showOverrideForm,
    setShowOverrideForm,
    showTimeOffForm,
    setShowTimeOffForm,
    showExtraHoursForm,
    setShowExtraHoursForm,
    showExtraShiftForm,
    setShowExtraShiftForm,
    editingExtraShift,
    setEditingExtraShift,
    reviewingRequest,
    setReviewingRequest,
    absenceSlot,
    setAbsenceSlot,
    // Handlers
    handleSuccess,
    handleDeleteTemplate,
    handleEditExtraShift,
    handleDeleteExtraShift,
    handleViewModeChange,
    handleDayClick,
    handleOverrideClose,
    openAddTemplate,
    openEditTemplate,
    openAddExtraShift,
  };
}

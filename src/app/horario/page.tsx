"use client";

import { useState, useMemo, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { useSchedule, getMonday } from "@/hooks/useSchedule";
import { useMonthSchedule, type MonthParams } from "@/hooks/useMonthSchedule";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { useExtraHours } from "@/hooks/useExtraHours";
import type { ScheduleTemplate, ScheduleSlot, TimeOffRequestWithUser } from "@/types";
import type { ViewMode } from "@/features/horario/components/ScheduleTab";
import { deleteTemplate, deleteExtraShift } from "@/features/horario";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import ScheduleTemplateForm from "@/features/horario/components/ScheduleTemplateForm";
import ExtraShiftForm from "@/features/horario/components/ExtraShiftForm";
import AbsenceConfirmModal from "@/features/horario/components/AbsenceConfirmModal";
import ScheduleOverrideForm from "@/components/forms/ScheduleOverrideForm";
import TimeOffRequestForm from "@/components/forms/TimeOffRequestForm";
import TimeOffReviewForm from "@/components/forms/TimeOffReviewForm";
import ExtraHoursForm from "@/components/forms/ExtraHoursForm";
import ScheduleTab from "@/features/horario/components/ScheduleTab";
import RequestsTab from "@/features/horario/components/RequestsTab";
import BalanceTab from "@/features/horario/components/BalanceTab";
import ScheduleTabsNav, { type TabId } from "@/features/horario/components/ScheduleTabsNav";

export default function HorarioPage() {
  const { user, isAdmin, profile } = useAuth();
  const confirm = useConfirm();
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

  // Use users from whichever view is active
  const activeUsers = viewMode === "weekly" ? users : monthUsers;

  // Modals
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | undefined>();
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [showExtraHoursForm, setShowExtraHoursForm] = useState(false);
  const [showExtraShiftForm, setShowExtraShiftForm] = useState(false);
  const [editingExtraShift, setEditingExtraShift] = useState<ScheduleSlot | undefined>();
  const [reviewingRequest, setReviewingRequest] = useState<TimeOffRequestWithUser | null>(null);
  const [absenceSlot, setAbsenceSlot] = useState<ScheduleSlot | null>(null);

  // Derived state
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
  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await deleteTemplate(templateId, user?.id ?? null, profile?.full_name ?? null);
      mutateSchedule();
      mutateMonthSchedule();
      toast.success("Turno eliminado");
    } catch (err) {
      console.error("Error al eliminar turno:", err);
      toast.error(err instanceof Error ? err.message : "Error al eliminar turno");
    }
  };

  const handleSuccess = () => {
    mutateSchedule();
    mutateMonthSchedule();
    mutateRequests();
    mutateHours();
  };

  const handleEditExtraShift = (slot: ScheduleSlot) => {
    setEditingExtraShift(slot);
    setShowExtraShiftForm(true);
  };

  const handleDeleteExtraShift = async (slot: ScheduleSlot) => {
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
  };

  // View mode change with navigation sync
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (mode === "monthly") {
      // Sync month from current weekStart
      const d = new Date(weekStart + "T00:00:00");
      setMonthYear({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      // Sync week from current month (first Monday of the month)
      const firstOfMonth = new Date(monthYear.year, monthYear.month, 1);
      setWeekStart(getMonday(firstOfMonth));
    }
    setViewMode(mode);
  }, [weekStart, monthYear]);

  // Monthly calendar day click → open override form
  const handleDayClick = useCallback((date: string) => {
    setOverrideDefaultDate(date);
    setShowOverrideForm(true);
  }, []);

  // Reset override default date when form closes
  const handleOverrideClose = () => {
    setShowOverrideForm(false);
    setOverrideDefaultDate(undefined);
  };

  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Horario"
          subtitle="Gestiona los turnos del equipo"
          icon={<CalendarDays className="w-6 h-6 text-primary-700" />}
        />

        <ScheduleTabsNav
          activeTab={activeTab}
          onChange={setActiveTab}
          pendingCount={pendingCount}
          isAdmin={isAdmin}
        />

        <div className="flex-1 overflow-auto">
          {activeTab === "horario" && (
            <ScheduleTab
              slots={slots}
              templates={templates}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
              isAdmin={isAdmin}
              isLoading={scheduleLoading}
              onEditTemplate={(t) => {
                setEditingTemplate(t);
                setShowTemplateForm(true);
              }}
              onDeleteTemplate={handleDeleteTemplate}
              onAddTemplate={() => {
                setEditingTemplate(undefined);
                setShowTemplateForm(true);
              }}
              onAddOverride={() => setShowOverrideForm(true)}
              onAddExtraShift={() => {
                setEditingExtraShift(undefined);
                setShowExtraShiftForm(true);
              }}
              onMarkAbsence={(slot) => setAbsenceSlot(slot)}
              onEditExtraShift={handleEditExtraShift}
              onDeleteExtraShift={handleDeleteExtraShift}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              monthYear={monthYear}
              onMonthYearChange={setMonthYear}
              monthSlots={monthSlots}
              monthGridDates={monthGridDates}
              monthLoading={monthLoading}
              onDayClick={handleDayClick}
            />
          )}

          {activeTab === "solicitudes" && (
            <RequestsTab
              requests={requests}
              isLoading={requestsLoading}
              isAdmin={isAdmin}
              onReview={(req) => setReviewingRequest(req)}
            />
          )}

          {activeTab === "acumulado" && (
            <BalanceTab
              balances={balances}
              entries={extraHoursEntries}
              users={activeUsers}
              isLoading={hoursLoading}
              isAdmin={isAdmin}
              myBalance={myBalance}
              userId={user?.id}
            />
          )}
        </div>
      </section>

      {/* FABs */}
      {activeTab === "solicitudes" && !isAdmin && (
        <FAB onClick={() => setShowTimeOffForm(true)} label="Solicitar permiso" />
      )}
      {activeTab === "acumulado" && isAdmin && (
        <FAB onClick={() => setShowExtraHoursForm(true)} label="Registrar horas" />
      )}
      {activeTab === "horario" && isAdmin && (
        <div className="md:hidden">
          <FAB
            onClick={() => {
              setEditingTemplate(undefined);
              setShowTemplateForm(true);
            }}
            label="Agregar turno"
          />
        </div>
      )}

      {/* Modals */}
      <ScheduleTemplateForm
        isOpen={showTemplateForm}
        onClose={() => setShowTemplateForm(false)}
        onSuccess={handleSuccess}
        item={editingTemplate}
        users={activeUsers}
      />
      <ScheduleOverrideForm
        isOpen={showOverrideForm}
        onClose={handleOverrideClose}
        onSuccess={handleSuccess}
        users={activeUsers}
        defaultDate={overrideDefaultDate}
      />
      <TimeOffRequestForm
        isOpen={showTimeOffForm}
        onClose={() => setShowTimeOffForm(false)}
        onSuccess={handleSuccess}
        currentBalance={myBalance}
      />
      <TimeOffReviewForm
        isOpen={!!reviewingRequest}
        onClose={() => setReviewingRequest(null)}
        onSuccess={handleSuccess}
        request={reviewingRequest}
        employeeBalance={
          reviewingRequest
            ? getEmployeeBalance(reviewingRequest.user_id)
            : 0
        }
      />
      <ExtraShiftForm
        isOpen={showExtraShiftForm}
        onClose={() => {
          setShowExtraShiftForm(false);
          setEditingExtraShift(undefined);
        }}
        onSuccess={handleSuccess}
        users={activeUsers}
        item={editingExtraShift}
      />
      <AbsenceConfirmModal
        isOpen={!!absenceSlot}
        onClose={() => setAbsenceSlot(null)}
        onSuccess={handleSuccess}
        slot={absenceSlot}
      />
      <ExtraHoursForm
        isOpen={showExtraHoursForm}
        onClose={() => setShowExtraHoursForm(false)}
        onSuccess={handleSuccess}
        users={activeUsers}
      />
    </>
  );
}

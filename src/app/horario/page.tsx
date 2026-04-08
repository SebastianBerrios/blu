"use client";

import { useState, useMemo, useCallback } from "react";
import { CalendarDays, Clock, FileText, Wallet, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSchedule, getMonday } from "@/hooks/useSchedule";
import { useMonthSchedule, type MonthParams } from "@/hooks/useMonthSchedule";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { useExtraHours } from "@/hooks/useExtraHours";
import type { ScheduleTemplate, ScheduleSlot, TimeOffRequestWithUser } from "@/types";
import type { ViewMode } from "@/features/horario/components/ScheduleTab";
import { deleteTemplate } from "@/features/horario/services/scheduleService";
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

type TabId = "horario" | "solicitudes" | "acumulado";

export default function HorarioPage() {
  const { user, isAdmin, profile } = useAuth();
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
    } catch (err) {
      console.error("Error al eliminar turno:", err);
    }
  };

  const handleSuccess = () => {
    mutateSchedule();
    mutateMonthSchedule();
    mutateRequests();
    mutateHours();
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

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6">
          <div className="flex gap-1">
            {([
              { id: "horario", label: "Horario", icon: Clock },
              {
                id: "solicitudes",
                label: "Solicitudes",
                icon: FileText,
                badge: isAdmin && pendingCount > 0 ? pendingCount : undefined,
              },
              { id: "acumulado", label: "Acumulado", icon: Wallet },
            ] satisfies { id: TabId; label: string; icon: LucideIcon; badge?: number }[]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
              onAddExtraShift={() => setShowExtraShiftForm(true)}
              onMarkAbsence={(slot) => setAbsenceSlot(slot)}
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
        onClose={() => setShowExtraShiftForm(false)}
        onSuccess={handleSuccess}
        users={activeUsers}
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

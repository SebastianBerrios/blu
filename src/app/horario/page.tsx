"use client";

import { CalendarDays } from "lucide-react";
import { useHorarioPage } from "@/features/horario/hooks/useHorarioPage";
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
import ScheduleTabsNav from "@/features/horario/components/ScheduleTabsNav";

export default function HorarioPage() {
  const {
    isAdmin,
    activeTab,
    setActiveTab,
    pendingCount,
    viewMode,
    weekStart,
    setWeekStart,
    monthYear,
    setMonthYear,
    overrideDefaultDate,
    slots,
    templates,
    scheduleLoading,
    monthSlots,
    monthGridDates,
    monthLoading,
    activeUsers,
    requests,
    requestsLoading,
    extraHoursEntries,
    balances,
    hoursLoading,
    myBalance,
    user,
    getEmployeeBalance,
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
  } = useHorarioPage();

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
              onEditTemplate={openEditTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onAddTemplate={openAddTemplate}
              onAddOverride={() => setShowOverrideForm(true)}
              onAddExtraShift={openAddExtraShift}
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
          <FAB onClick={openAddTemplate} label="Agregar turno" />
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
        employeeBalance={reviewingRequest ? getEmployeeBalance(reviewingRequest.user_id) : 0}
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

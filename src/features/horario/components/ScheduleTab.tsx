"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { ScheduleSlot, ScheduleTemplate, DayOfWeek } from "@/types";
import { getMonday, getWeekDates } from "@/hooks/useSchedule";
import { getMonthLabel, toLocalDateStr } from "../utils/calendarDates";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { DAY_LABELS_SHORT } from "../constants";
import DesktopScheduleGrid from "./DesktopScheduleGrid";
import MobileDayView from "./MobileDayView";
import MonthlyCalendarGrid from "./MonthlyCalendarGrid";
import MobileMonthView from "./MobileMonthView";

export type ViewMode = "weekly" | "monthly";

interface ScheduleTabProps {
  slots: ScheduleSlot[];
  templates: ScheduleTemplate[];
  weekStart: string;
  setWeekStart: (ws: string) => void;
  isAdmin: boolean;
  isLoading: boolean;
  onEditTemplate: (t: ScheduleTemplate) => void;
  onDeleteTemplate: (id: number) => void;
  onAddTemplate: () => void;
  onAddOverride: () => void;
  onAddExtraShift: () => void;
  onMarkAbsence: (slot: ScheduleSlot) => void;
  // Monthly view props
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  monthYear: { year: number; month: number };
  onMonthYearChange: (my: { year: number; month: number }) => void;
  monthSlots: ScheduleSlot[];
  monthGridDates: string[];
  monthLoading: boolean;
  onDayClick: (date: string) => void;
}

export default function ScheduleTab({
  slots,
  templates,
  weekStart,
  setWeekStart,
  isAdmin,
  isLoading,
  onEditTemplate,
  onDeleteTemplate,
  onAddTemplate,
  onAddOverride,
  onAddExtraShift,
  onMarkAbsence,
  viewMode,
  onViewModeChange,
  monthYear,
  onMonthYearChange,
  monthSlots,
  monthGridDates,
  monthLoading,
  onDayClick,
}: ScheduleTabProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const today = new Date().getDay();
    const mapped = today === 0 ? 6 : today - 1;
    return Math.min(mapped, 6) as DayOfWeek;
  });

  const weekDates = getWeekDates(weekStart);

  const navigateWeek = (direction: number) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(toLocalDateStr(d));
  };

  const navigateMonth = (direction: number) => {
    const newMonth = monthYear.month + direction;
    if (newMonth < 0) {
      onMonthYearChange({ year: monthYear.year - 1, month: 11 });
    } else if (newMonth > 11) {
      onMonthYearChange({ year: monthYear.year + 1, month: 0 });
    } else {
      onMonthYearChange({ year: monthYear.year, month: newMonth });
    }
  };

  const formatWeekLabel = () => {
    const start = new Date(weekDates[0] + "T00:00:00");
    const end = new Date(weekDates[weekDates.length - 1] + "T00:00:00");
    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = start.toLocaleDateString("es-PE", { month: "long" });
    const year = start.getFullYear();
    return `${startDay} - ${endDay} de ${month} ${year}`;
  };

  const goToToday = () => {
    if (viewMode === "weekly") {
      setWeekStart(getMonday());
    } else {
      const now = new Date();
      onMonthYearChange({ year: now.getFullYear(), month: now.getMonth() });
    }
  };

  const activeLoading = viewMode === "weekly" ? isLoading : monthLoading;
  const navigationLabel = viewMode === "weekly"
    ? formatWeekLabel()
    : getMonthLabel(monthYear.year, monthYear.month);
  const navigate = viewMode === "weekly" ? navigateWeek : navigateMonth;

  return (
    <div className="p-4 md:p-6">
      {/* View mode toggle + Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center space-y-1.5">
          {/* Segmented control */}
          <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange("weekly")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "weekly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => onViewModeChange("monthly")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Mensual
            </button>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 capitalize">
            {navigationLabel}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs text-primary-600 hover:underline"
          >
            Hoy
          </button>
        </div>
        <button
          onClick={() => navigate(1)}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Admin action buttons */}
      {isAdmin && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button variant="primary" size="sm" onClick={onAddTemplate}>
            <Plus className="w-4 h-4 mr-1" />
            Turno
          </Button>
          <Button variant="secondary" size="sm" onClick={onAddOverride}>
            <Plus className="w-4 h-4 mr-1" />
            Excepción
          </Button>
          <Button variant="ghost" size="sm" onClick={onAddExtraShift}>
            <Plus className="w-4 h-4 mr-1" />
            Turno Extra
          </Button>
        </div>
      )}

      {activeLoading ? (
        <Spinner text="Cargando horario..." />
      ) : viewMode === "weekly" ? (
        <>
          {/* DESKTOP: Weekly grid */}
          <div className="hidden md:block">
            <DesktopScheduleGrid
              slots={slots}
              weekDates={weekDates}
              templates={templates}
              isAdmin={isAdmin}
              onEditTemplate={onEditTemplate}
              onDeleteTemplate={onDeleteTemplate}
              onMarkAbsence={onMarkAbsence}
            />
          </div>

          {/* MOBILE: Day view */}
          <div className="md:hidden">
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {DAY_LABELS_SHORT.map((label, i) => {
                const isToday =
                  weekDates[i] === toLocalDateStr(new Date());
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(i as DayOfWeek)}
                    className={`flex-1 min-w-[48px] px-2 py-2 rounded-lg text-center transition-colors ${
                      selectedDay === i
                        ? "bg-primary-500 text-white"
                        : isToday
                        ? "bg-primary-100 text-primary-700"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-medium">{label}</div>
                    <div className="text-sm font-bold">
                      {new Date(weekDates[i] + "T00:00:00").getDate()}
                    </div>
                  </button>
                );
              })}
            </div>

            <MobileDayView
              slots={slots.filter((s) => s.day_of_week === selectedDay)}
              isAdmin={isAdmin}
              onMarkAbsence={onMarkAbsence}
            />
          </div>
        </>
      ) : (
        <>
          {/* DESKTOP: Monthly calendar */}
          <div className="hidden md:block">
            <MonthlyCalendarGrid
              slots={monthSlots}
              gridDates={monthGridDates}
              currentMonth={monthYear.month}
              currentYear={monthYear.year}
              isAdmin={isAdmin}
              onDayClick={onDayClick}
            />
          </div>

          {/* MOBILE: Monthly mini calendar + day detail */}
          <div className="md:hidden">
            <MobileMonthView
              slots={monthSlots}
              gridDates={monthGridDates}
              currentMonth={monthYear.month}
              currentYear={monthYear.year}
              isAdmin={isAdmin}
              onDayClick={onDayClick}
              onMarkAbsence={onMarkAbsence}
            />
          </div>
        </>
      )}
    </div>
  );
}

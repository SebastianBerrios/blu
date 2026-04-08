import type { DayOfWeek } from "@/types";

/** Formats a Date to "YYYY-MM-DD" using LOCAL time (not UTC). */
export function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns an array of ISO date strings for a full calendar grid (5 or 6 weeks).
 * Starts on Monday and includes padding days from adjacent months.
 */
export function getMonthGridDates(year: number, month: number): string[] {
  // First day of the month
  const firstDay = new Date(year, month, 1);
  // JS: 0=Sun, we want Mon=0. Convert: Mon=0, Tue=1, ..., Sun=6
  const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  // Start from the Monday before (or on) the 1st
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - firstDayOfWeek);

  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;

  // End on Sunday after (or on) the last day
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + (6 - lastDayOfWeek));

  const dates: string[] = [];
  const current = new Date(gridStart);
  while (current <= gridEnd) {
    dates.push(toLocalDateStr(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Converts an ISO date string to DayOfWeek (0=Mon..6=Sun).
 */
export function getDayOfWeekFromDate(isoDate: string): DayOfWeek {
  const jsDay = new Date(isoDate + "T00:00:00").getDay();
  // JS: 0=Sun, 1=Mon...6=Sat → we want 0=Mon...6=Sun
  return (jsDay === 0 ? 6 : jsDay - 1) as DayOfWeek;
}

/**
 * Returns a Spanish month label like "abril 2026".
 */
export function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}

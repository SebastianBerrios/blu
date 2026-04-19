import type { DateRangePreset, PeriodRanges, Granularity } from "@/types";

export const PRESETS: { value: DateRangePreset; label: string; shortLabel: string }[] = [
  { value: "today", label: "Hoy", shortLabel: "Hoy" },
  { value: "week", label: "Semana", shortLabel: "Sem" },
  { value: "month", label: "Mes", shortLabel: "Mes" },
  { value: "year", label: "Año", shortLabel: "Año" },
  { value: "custom", label: "Personalizado", shortLabel: "Rango" },
];

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(d: Date): Date {
  const copy = startOfDay(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  s.setDate(s.getDate() + 6);
  return endOfDay(s);
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

function endOfYear(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), 11, 31));
}

function formatRange(start: Date, end: Date, preset: DateRangePreset): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (preset === "today" || (preset === "custom" && sameDay)) {
    return start.toLocaleDateString("es-PE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  if (preset === "year") {
    return `${start.getFullYear()}`;
  }
  if (preset === "month") {
    return start.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  }
  const startLabel = start.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export function getPeriodRanges(
  preset: DateRangePreset,
  anchor: Date = new Date(),
  custom?: { startDate: string; endDate: string },
): PeriodRanges {
  let curStart: Date;
  let curEnd: Date;
  let granularity: Granularity = "day";

  if (preset === "today") {
    curStart = startOfDay(anchor);
    curEnd = endOfDay(anchor);
    granularity = "hour";
  } else if (preset === "week") {
    curStart = startOfWeek(anchor);
    curEnd = endOfWeek(anchor);
    granularity = "day";
  } else if (preset === "month") {
    curStart = startOfMonth(anchor);
    curEnd = endOfMonth(anchor);
    granularity = "day";
  } else if (preset === "year") {
    curStart = startOfYear(anchor);
    curEnd = endOfYear(anchor);
    granularity = "month";
  } else {
    curStart = custom
      ? startOfDay(new Date(`${custom.startDate}T12:00:00`))
      : startOfDay(anchor);
    curEnd = custom
      ? endOfDay(new Date(`${custom.endDate}T12:00:00`))
      : endOfDay(anchor);
    const days = Math.round((curEnd.getTime() - curStart.getTime()) / 86400000);
    granularity = days > 120 ? "month" : days <= 1 ? "hour" : "day";
  }

  // Previous period: shift back by the same span
  const spanMs = curEnd.getTime() - curStart.getTime();
  let prevStart: Date;
  let prevEnd: Date;
  if (preset === "month") {
    prevEnd = endOfMonth(new Date(curStart.getFullYear(), curStart.getMonth() - 1, 15));
    prevStart = startOfMonth(prevEnd);
  } else if (preset === "year") {
    prevEnd = endOfYear(new Date(curStart.getFullYear() - 1, 5, 15));
    prevStart = startOfYear(prevEnd);
  } else if (preset === "today") {
    const prevAnchor = new Date(curStart);
    prevAnchor.setDate(prevAnchor.getDate() - 7);
    prevStart = startOfDay(prevAnchor);
    prevEnd = endOfDay(prevAnchor);
  } else {
    prevStart = new Date(curStart.getTime() - spanMs - 1);
    prevEnd = new Date(curStart.getTime() - 1);
  }

  return {
    preset,
    current: { start: curStart.toISOString(), end: curEnd.toISOString() },
    previous: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
    granularity,
    label: formatRange(curStart, curEnd, preset),
    previousLabel: formatRange(prevStart, prevEnd, preset),
  };
}

export function navigateAnchor(
  anchor: Date,
  preset: DateRangePreset,
  direction: -1 | 1,
): Date {
  const d = new Date(anchor);
  if (preset === "today") {
    d.setDate(d.getDate() + direction);
  } else if (preset === "week") {
    d.setDate(d.getDate() + 7 * direction);
  } else if (preset === "month") {
    d.setMonth(d.getMonth() + direction);
  } else if (preset === "year") {
    d.setFullYear(d.getFullYear() + direction);
  }
  return d;
}

export function canNavigateForward(anchor: Date, preset: DateRangePreset): boolean {
  if (preset === "custom") return false;
  const next = navigateAnchor(anchor, preset, 1);
  const today = new Date();
  if (preset === "today") return next <= endOfDay(today);
  if (preset === "week") return startOfWeek(next) <= endOfWeek(today);
  if (preset === "month") return startOfMonth(next) <= startOfMonth(today);
  if (preset === "year") return next.getFullYear() <= today.getFullYear();
  return false;
}

// Chart.js palette
export const CHART_COLORS = {
  primary: "#0369a1",
  primaryFill: "rgba(3, 105, 161, 0.1)",
  primaryDashed: "#94a3b8",
  green: "#16a34a",
  greenFill: "rgba(22, 163, 74, 0.1)",
  red: "#dc2626",
  redFill: "rgba(220, 38, 38, 0.1)",
  amber: "#d97706",
  violet: "#7c3aed",
  indigo: "#4f46e5",
  blue: "#2563eb",
};

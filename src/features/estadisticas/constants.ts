import type { DateRange, DateRangePreset } from "@/types";

export const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
];

export function getDateRange(preset: DateRangePreset): DateRange {
  const end = new Date();
  const start = new Date();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10) + "T23:59:59",
    preset,
  };
}

// Chart.js palette
export const CHART_COLORS = {
  primary: "#0369a1",
  primaryFill: "rgba(3, 105, 161, 0.1)",
  green: "#16a34a",
  greenFill: "rgba(22, 163, 74, 0.1)",
  red: "#dc2626",
  redFill: "rgba(220, 38, 38, 0.1)",
  amber: "#d97706",
  violet: "#7c3aed",
  indigo: "#4f46e5",
  blue: "#2563eb",
};

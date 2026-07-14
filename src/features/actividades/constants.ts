import type { Activity, TaskCategory } from "@/types";

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  apertura: "Apertura",
  jornada: "Jornada",
  cierre: "Cierre",
};

export const CATEGORY_STYLES: Record<TaskCategory, { bg: string; text: string; border: string }> = {
  apertura: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  jornada: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  cierre: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

export const CATEGORY_ORDER: TaskCategory[] = ["apertura", "jornada", "cierre"];

// Label + style for the "on demand" section, shown apart from the shift phases.
export const ON_DEMAND_LABEL = "Según necesidad";
export const ON_DEMAND_STYLE = { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };

// 0=Mon … 5=Sat
export const DAY_LABELS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  interval: "Cada N días",
  on_demand: "Según necesidad",
};

/** Human-readable frequency for a catalog row (e.g. "Lun, Mié, Vie", "Interdiario"). */
export function frequencyLabel(
  a: Pick<Activity, "frequency" | "days_of_week" | "interval_days">
): string {
  switch (a.frequency) {
    case "daily":
      return "Diaria";
    case "weekly": {
      const days = (a.days_of_week ?? [])
        .slice()
        .sort((x, y) => x - y)
        .map((d) => DAY_LABELS_SHORT[d])
        .filter(Boolean)
        .join(", ");
      return days || "Semanal";
    }
    case "interval": {
      const n = a.interval_days ?? 0;
      if (n === 2) return "Interdiario";
      return `Cada ${n} días`;
    }
    case "on_demand":
      return ON_DEMAND_LABEL;
    default:
      return a.frequency;
  }
}

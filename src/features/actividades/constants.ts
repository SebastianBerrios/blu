import type { TaskCategory } from "@/types/activity";

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

export const DAY_LABELS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diaria",
  weekly: "Semanal",
};

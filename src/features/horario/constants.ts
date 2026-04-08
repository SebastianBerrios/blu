export const DAY_LABELS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DAY_LABELS_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export const ROLE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  cocinero: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  barista: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  admin: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
};

export const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pendiente: { bg: "bg-yellow-100", text: "text-yellow-800" },
  aprobado: { bg: "bg-green-100", text: "text-green-800" },
  rechazado: { bg: "bg-red-100", text: "text-red-800" },
};

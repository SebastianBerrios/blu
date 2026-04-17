const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * "3 de abril de 2026" — used in sales, compras, auditoria date group headers
 */
export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${parseInt(day)} de ${MONTHS_LONG[parseInt(month) - 1]} de ${year}`;
}

/**
 * "03/04/26, 14:30" — used in inventario movement history
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * "03 abr 2026" or "-" — used in users table (registration date)
 */
export function formatDateMedium(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * "03, abr" — used in estadisticas chart labels
 */
export function formatDateChart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

/**
 * "lun, 3 abr" — used in horario RequestCard
 */
export function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * "lunes, 3 de abril" — used in TimeOffReviewForm
 */
export function formatDateWithWeekdayLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * "14:30" — used in sales, compras, auditoria, pedidos
 */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Converts a local calendar day (YYYY-MM-DD) into a UTC ISO range that covers
 * exactly that day in the user's local timezone.
 *
 * Use whenever you filter a `timestamptz` column by a day picked in the UI.
 * Never concatenate `T00:00:00` without a Z suffix and send it to Supabase —
 * Postgres treats naked strings as UTC and will shift the window.
 */
export function localDayRangeISO(dateKey: string): { start: string; end: string } {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${dateKey}T23:59:59.999`);
  return { start: start.toISOString(), end: end.toISOString() };
}

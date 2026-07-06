const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * "3 de abril de 2026" — used in sales, compras, auditoria date group headers
 */
export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${parseInt(day)} de ${MONTHS_LONG[parseInt(month) - 1]} de ${year}`;
}

/**
 * Week range label ("YYYY-MM-DD" bounds) — used in horario weekly navigation.
 * Same month: "2 - 8 de junio 2026"
 * Crossing months: "29 jun - 5 jul 2026"
 * Crossing years: "29 dic 2025 - 4 ene 2026"
 */
export function formatWeekRange(startStr: string, endStr: string): string {
  const [startYear, startMonth, startDay] = startStr.split("-").map(Number);
  const [endYear, endMonth, endDay] = endStr.split("-").map(Number);

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay} - ${endDay} de ${MONTHS_LONG[startMonth - 1]} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${MONTHS_SHORT[startMonth - 1]} - ${endDay} ${MONTHS_SHORT[endMonth - 1]} ${startYear}`;
  }
  return `${startDay} ${MONTHS_SHORT[startMonth - 1]} ${startYear} - ${endDay} ${MONTHS_SHORT[endMonth - 1]} ${endYear}`;
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

const LIMA_TZ = "America/Lima";

const limaDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIMA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * "YYYY-MM-DD" for a given moment, interpreted in America/Lima.
 * Use this whenever you need a date key that matches what the cafe staff calls "today",
 * regardless of the browser's local timezone.
 */
export function limaDateKey(date: Date | string | number = new Date()): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return limaDateKeyFormatter.format(d);
}

/**
 * UTC ISO range that covers exactly one Lima calendar day. Defaults to today (Lima).
 *
 * Use as `gte`/`lte` filters on Postgres timestamptz columns to query "the day Juan called X"
 * even when the browser is in a different timezone than America/Lima.
 *
 * Lima is fixed UTC-5 (no DST), so day [00:00, 24:00) Lima =
 * [05:00 UTC same day, 05:00 UTC next day).
 */
export function limaDayRangeISO(dateKey: string = limaDateKey()): { start: string; end: string } {
  const startISO = `${dateKey}T05:00:00.000Z`;
  const startMs = new Date(startISO).getTime();
  return {
    start: startISO,
    end: new Date(startMs + 24 * 60 * 60 * 1000 - 1).toISOString(),
  };
}

/**
 * Hour of day (0-23) for a timestamp, expressed in America/Lima time.
 * Lima is UTC-5 with no DST, so this is equivalent to UTC hour − 5 (mod 24).
 *
 * Use instead of `new Date(ts).getHours()` (which uses browser TZ) or
 * `new Date(ts).getUTCHours()` (UTC) when bucketing sales by hour-of-day
 * for cafe staff whose day runs in Lima time.
 *
 * Sync pair: useSalesStats hourMap bucketing (F7 fix).
 */
export function hourInLima(ts: string | Date): number {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  // Lima is UTC-5 fixed. Convert by shifting the UTC hours.
  return ((d.getUTCHours() - 5 + 24) % 24);
}

/**
 * Day of week (0=Monday … 6=Sunday) for a timestamp in America/Lima time.
 * Matches the Mon-Sun convention used in useSalesStats heatmap (dow remapping).
 *
 * Use instead of `new Date(ts).getDay()` (which uses browser TZ) when
 * bucketing by day-of-week for heatmap charts aligned to Lima business days.
 *
 * Sync pair: useSalesStats heatmapMap bucketing (F7 fix).
 */
export function dayInLima(ts: string | Date): number {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  // Build the Lima date from UTC components shifted by −5 h.
  const limaMs = d.getTime() - 5 * 60 * 60 * 1000;
  const limaD = new Date(limaMs);
  // getUTCDay() returns 0=Sun; remap to 0=Mon … 6=Sun to match the heatmap.
  const utcDay = limaD.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  return utcDay === 0 ? 6 : utcDay - 1; // Mon=0 … Sun=6
}

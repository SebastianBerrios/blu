/**
 * Converts an ISO date string to a local YYYY-MM-DD key.
 * Avoids timezone issues by using local date parts instead of toISOString().
 */
export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface DateGroup<T> {
  date: string;
  items: T[];
}

/**
 * Groups an array of items by date (descending), using a getter to extract the date field.
 * Returns groups sorted newest-first.
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string
): DateGroup<T>[] {
  const groups: Record<string, T[]> = {};

  for (const item of items) {
    const dateKey = toLocalDateKey(getDate(item));
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

import type { Activity } from "@/types";

/**
 * Frequency scheduling helpers for activities.
 *
 * Day-of-week convention across the app: 0=Mon … 5=Sat, 6=Sun.
 * The café works a 6-day week (Mon–Sat); Sunday (6) is never a working day.
 *
 * All date math is done in UTC from the "YYYY-MM-DD" string so results are
 * independent of the runner/browser timezone.
 */

type SchedulingFields = Pick<
  Activity,
  "frequency" | "days_of_week" | "interval_days" | "anchor_date"
>;

/** Day of week (0=Mon … 6=Sun) for a "YYYY-MM-DD" date string. */
export function dayOfWeekMon0(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun…6=Sat
  return day === 0 ? 6 : day - 1;
}

/** Whole days from `anchor` to `dateStr` (negative if before the anchor). */
export function daysBetween(anchor: string, dateStr: string): number {
  const [ay, am, ad] = anchor.split("-").map(Number);
  const [y, m, d] = dateStr.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Whether a SCHEDULED activity applies on a given date.
 * `on_demand` activities are never scheduled — they are surfaced in their own
 * "Según necesidad" section (see {@link isOnDemand}), so this returns false.
 */
export function isActivityScheduledForDate(
  activity: SchedulingFields,
  dateStr: string
): boolean {
  const dow = dayOfWeekMon0(dateStr);
  if (dow > 5) return false; // Sunday — no work

  switch (activity.frequency) {
    case "daily":
      return true;
    case "weekly":
      return !!activity.days_of_week?.includes(dow);
    case "interval": {
      if (!activity.anchor_date || !activity.interval_days || activity.interval_days <= 0) {
        return false;
      }
      const diff = daysBetween(activity.anchor_date, dateStr);
      return diff >= 0 && diff % activity.interval_days === 0;
    }
    case "on_demand":
    default:
      return false;
  }
}

export function isOnDemand(activity: Pick<Activity, "frequency">): boolean {
  return activity.frequency === "on_demand";
}

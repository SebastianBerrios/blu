import { describe, it, expect } from "vitest";
import type { Activity } from "@/types";
import {
  dayOfWeekMon0,
  daysBetween,
  isActivityScheduledForDate,
  isOnDemand,
} from "./frequency";

// Reference weekdays (UTC):
//  2026-07-13 Mon(0) · 07-14 Tue(1) · 07-15 Wed(2) · 07-16 Thu(3)
//  2026-07-17 Fri(4) · 07-18 Sat(5) · 07-19 Sun(6) · 07-20 Mon(0)

function act(partial: Partial<Activity>): Activity {
  return {
    id: 1,
    title: "x",
    description: null,
    category: "cierre",
    frequency: "daily",
    days_of_week: null,
    interval_days: null,
    anchor_date: null,
    sort_order: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("dayOfWeekMon0", () => {
  it("maps Sunday to 6 and Monday to 0", () => {
    expect(dayOfWeekMon0("2026-07-19")).toBe(6); // Sunday
    expect(dayOfWeekMon0("2026-07-13")).toBe(0); // Monday
    expect(dayOfWeekMon0("2026-07-17")).toBe(4); // Friday
  });
});

describe("daysBetween", () => {
  it("counts whole days and is negative before the anchor", () => {
    expect(daysBetween("2026-07-13", "2026-07-15")).toBe(2);
    expect(daysBetween("2026-07-13", "2026-07-13")).toBe(0);
    expect(daysBetween("2026-07-13", "2026-07-11")).toBe(-2);
  });
});

describe("isActivityScheduledForDate", () => {
  it("daily: true on any weekday, false on Sunday", () => {
    const a = act({ frequency: "daily" });
    expect(isActivityScheduledForDate(a, "2026-07-14")).toBe(true);
    expect(isActivityScheduledForDate(a, "2026-07-19")).toBe(false); // Sunday
  });

  it("weekly: only on the listed weekdays", () => {
    const a = act({ frequency: "weekly", days_of_week: [4] }); // Friday
    expect(isActivityScheduledForDate(a, "2026-07-17")).toBe(true); // Fri
    expect(isActivityScheduledForDate(a, "2026-07-16")).toBe(false); // Thu
  });

  it("interval: every N days from the anchor, skipping Sundays", () => {
    const a = act({ frequency: "interval", interval_days: 2, anchor_date: "2026-07-13" });
    expect(isActivityScheduledForDate(a, "2026-07-13")).toBe(true); // diff 0
    expect(isActivityScheduledForDate(a, "2026-07-15")).toBe(true); // diff 2
    expect(isActivityScheduledForDate(a, "2026-07-17")).toBe(true); // diff 4
    expect(isActivityScheduledForDate(a, "2026-07-14")).toBe(false); // diff 1
    expect(isActivityScheduledForDate(a, "2026-07-16")).toBe(false); // diff 3
    expect(isActivityScheduledForDate(a, "2026-07-19")).toBe(false); // diff 6 but Sunday
  });

  it("interval: not applicable before the anchor date", () => {
    const a = act({ frequency: "interval", interval_days: 2, anchor_date: "2026-07-13" });
    expect(isActivityScheduledForDate(a, "2026-07-11")).toBe(false); // diff -2
  });

  it("interval: false when config is incomplete", () => {
    expect(
      isActivityScheduledForDate(
        act({ frequency: "interval", interval_days: null, anchor_date: "2026-07-13" }),
        "2026-07-13"
      )
    ).toBe(false);
  });

  it("on_demand: never scheduled", () => {
    const a = act({ frequency: "on_demand" });
    expect(isActivityScheduledForDate(a, "2026-07-14")).toBe(false);
    expect(isOnDemand(a)).toBe(true);
  });
});

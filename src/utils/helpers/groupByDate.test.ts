import { describe, it, expect } from "vitest";
import { groupByDate, toLocalDateKey } from "./groupByDate";

describe("toLocalDateKey", () => {
  it("returns YYYY-MM-DD for a noon UTC date", () => {
    const key = toLocalDateKey("2026-04-03T12:00:00.000Z");
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("zero-pads month and day", () => {
    const key = toLocalDateKey("2026-01-09T12:00:00.000Z");
    const [, month, day] = key.split("-");
    expect(month).toHaveLength(2);
    expect(day).toHaveLength(2);
  });
});

describe("groupByDate", () => {
  it("returns empty array for empty input", () => {
    expect(groupByDate([], (i) => i as string)).toEqual([]);
  });

  it("groups items by their date key", () => {
    const items = [
      { id: 1, date: "2026-04-03T08:00:00Z" },
      { id: 2, date: "2026-04-03T18:00:00Z" },
      { id: 3, date: "2026-04-04T10:00:00Z" },
    ];
    const groups = groupByDate(items, (x) => x.date);
    expect(groups).toHaveLength(2);
    const sorted = groups.sort((a, b) => b.date.localeCompare(a.date));
    expect(sorted[0].items).toHaveLength(1);
    expect(sorted[1].items).toHaveLength(2);
  });

  it("returns groups sorted newest first", () => {
    const items = [
      { id: 1, date: "2026-04-01T12:00:00Z" },
      { id: 2, date: "2026-04-05T12:00:00Z" },
      { id: 3, date: "2026-04-03T12:00:00Z" },
    ];
    const groups = groupByDate(items, (x) => x.date);
    expect(groups.map((g) => g.date)).toEqual(
      [...groups.map((g) => g.date)].sort((a, b) => b.localeCompare(a)),
    );
    expect(groups[0].date.localeCompare(groups[groups.length - 1].date)).toBeGreaterThan(0);
  });

  it("preserves item order within a group (insertion order)", () => {
    const items = [
      { id: 10, date: "2026-04-03T08:00:00Z" },
      { id: 11, date: "2026-04-03T09:00:00Z" },
      { id: 12, date: "2026-04-03T10:00:00Z" },
    ];
    const groups = groupByDate(items, (x) => x.date);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((x) => x.id)).toEqual([10, 11, 12]);
  });

  it("works with arbitrary item shapes via getter", () => {
    const items = [{ when: "2026-04-03T12:00:00Z" }, { when: "2026-04-04T12:00:00Z" }];
    const groups = groupByDate(items, (x) => x.when);
    expect(groups).toHaveLength(2);
  });
});

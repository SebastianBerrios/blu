import { describe, it, expect } from "vitest";
import {
  formatDateLong,
  formatDateMedium,
  formatWeekRange,
  localDayRangeISO,
  limaDateKey,
  limaDayRangeISO,
} from "./dateFormatters";

describe("formatDateLong", () => {
  it('formats "2026-04-03" as "3 de abril de 2026"', () => {
    expect(formatDateLong("2026-04-03")).toBe("3 de abril de 2026");
  });

  it("strips leading zero from day", () => {
    expect(formatDateLong("2026-01-09")).toBe("9 de enero de 2026");
  });

  it("uses Spanish month names", () => {
    expect(formatDateLong("2026-12-25")).toBe("25 de diciembre de 2026");
    expect(formatDateLong("2026-08-15")).toBe("15 de agosto de 2026");
  });
});

describe("formatWeekRange", () => {
  it("same month: '2 - 8 de junio 2026'", () => {
    expect(formatWeekRange("2026-06-02", "2026-06-08")).toBe(
      "2 - 8 de junio 2026",
    );
  });

  it("crossing months: '29 jun - 5 jul 2026'", () => {
    expect(formatWeekRange("2026-06-29", "2026-07-05")).toBe(
      "29 jun - 5 jul 2026",
    );
  });

  it("crossing years: '29 dic 2025 - 4 ene 2026'", () => {
    expect(formatWeekRange("2025-12-29", "2026-01-04")).toBe(
      "29 dic 2025 - 4 ene 2026",
    );
  });

  it("strips leading zeros from days", () => {
    expect(formatWeekRange("2026-03-02", "2026-03-08")).toBe(
      "2 - 8 de marzo 2026",
    );
    expect(formatWeekRange("2026-08-31", "2026-09-06")).toBe(
      "31 ago - 6 sep 2026",
    );
  });
});

describe("formatDateMedium", () => {
  it('returns "-" for null', () => {
    expect(formatDateMedium(null)).toBe("-");
  });

  it("returns a non-empty Spanish-ish string for a valid ISO", () => {
    const result = formatDateMedium("2026-04-03T12:00:00.000Z");
    expect(result).toMatch(/2026/);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("localDayRangeISO", () => {
  it('returns ISO range for a calendar day', () => {
    const range = localDayRangeISO("2026-04-03");
    expect(typeof range.start).toBe("string");
    expect(typeof range.end).toBe("string");
    expect(range.start.endsWith("Z")).toBe(true);
    expect(range.end.endsWith("Z")).toBe(true);
    expect(new Date(range.end).getTime()).toBeGreaterThan(
      new Date(range.start).getTime(),
    );
  });

  it("end is approximately 24h after start (modulo DST)", () => {
    const range = localDayRangeISO("2026-06-15");
    const diffMs =
      new Date(range.end).getTime() - new Date(range.start).getTime();
    expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThan(24 * 60 * 60 * 1000 + 1);
  });
});

describe("limaDateKey", () => {
  it("UTC midnight maps to previous Lima day (Lima is UTC-5)", () => {
    // 2026-05-07 00:00 UTC = 2026-05-06 19:00 Lima
    expect(limaDateKey("2026-05-07T00:00:00.000Z")).toBe("2026-05-06");
  });

  it("UTC 04:59 still maps to previous Lima day (just before Lima midnight)", () => {
    // 2026-05-07 04:59 UTC = 2026-05-06 23:59 Lima
    expect(limaDateKey("2026-05-07T04:59:00.000Z")).toBe("2026-05-06");
  });

  it("UTC 05:00 maps to same Lima day (Lima midnight start)", () => {
    expect(limaDateKey("2026-05-07T05:00:00.000Z")).toBe("2026-05-07");
  });

  it("daytime UTC maps to same Lima day", () => {
    // 2026-05-06 18:00 UTC = 2026-05-06 13:00 Lima
    expect(limaDateKey("2026-05-06T18:00:00.000Z")).toBe("2026-05-06");
  });

  it("accepts a Date object", () => {
    expect(limaDateKey(new Date("2026-05-07T00:00:00.000Z"))).toBe("2026-05-06");
  });

  it("accepts an epoch ms number", () => {
    const ms = Date.UTC(2026, 4, 6, 18, 0, 0); // 2026-05-06 18:00 UTC
    expect(limaDateKey(ms)).toBe("2026-05-06");
  });
});

describe("limaDayRangeISO", () => {
  it("Lima 2026-05-06 → [05:00 UTC same day, 04:59:59.999 UTC next day)", () => {
    const range = limaDayRangeISO("2026-05-06");
    expect(range.start).toBe("2026-05-06T05:00:00.000Z");
    expect(range.end).toBe("2026-05-07T04:59:59.999Z");
  });

  it("end - start = exactly 24h - 1ms", () => {
    const range = limaDayRangeISO("2026-05-06");
    const diff = new Date(range.end).getTime() - new Date(range.start).getTime();
    expect(diff).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it("default (no arg) covers today in Lima", () => {
    const range = limaDayRangeISO();
    const today = limaDateKey();
    expect(range.start).toBe(`${today}T05:00:00.000Z`);
  });
});

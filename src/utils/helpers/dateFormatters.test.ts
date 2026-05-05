import { describe, it, expect } from "vitest";
import {
  formatDateLong,
  formatDateMedium,
  localDayRangeISO,
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

import { describe, expect, it } from "vitest";

import { formatMonth, formatPeriod } from "./format-month";

describe("formatMonth", () => {
  it.each([
    ["en", "Mar 2026"],
    ["id", "Mar 2026"],
  ] as const)("formats %s months", (locale, text) => {
    expect(formatMonth("2026-03", locale)).toBe(text);
  });

  it("formats May in Indonesian as Mei", () => {
    expect(formatMonth("2026-05", "id")).toBe("Mei 2026");
  });

  it("does not drift a month at a timezone boundary", () => {
    expect(formatMonth("2026-01", "en")).toBe("Jan 2026");
    expect(formatMonth("2025-12", "en")).toBe("Dec 2025");
  });
});

describe("formatPeriod", () => {
  it("uses the present label for an open end", () => {
    expect(formatPeriod("2026-03", null, "en", "Present")).toBe("Mar 2026 – Present");
  });

  it("joins two months with an en dash", () => {
    expect(formatPeriod("2025-09", "2026-03", "id", "Sekarang")).toBe("Sep 2025 – Mar 2026");
  });
});

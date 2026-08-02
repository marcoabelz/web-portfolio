import { describe, expect, it } from "vitest";

import { resolveRequestLocale } from "./request";

describe("resolveRequestLocale", () => {
  it("uses English only when the requested locale is absent", () => {
    expect(resolveRequestLocale(undefined)).toBe("en");
  });

  it.each(["en", "id"] as const)("preserves supported locale %s", (locale) => {
    expect(resolveRequestLocale(locale)).toBe(locale);
  });

  it("responds with not found for a present unsupported locale", () => {
    expect(() => resolveRequestLocale("fr")).toThrowError("NEXT_NOT_FOUND");
  });
});

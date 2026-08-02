import { describe, expect, it } from "vitest";

import {
  canonicalPath,
  isLocale,
  languageAlternates,
  localizePath,
} from "./locale";

describe("isLocale", () => {
  it.each([
    ["en", true],
    ["id", true],
    ["fr", false],
    ["EN", false],
    [undefined, false],
  ])("returns %s for %j", (value, expected) => {
    expect(isLocale(value)).toBe(expected);
  });
});

describe("localizePath", () => {
  it("leaves the default locale unprefixed", () => {
    expect(localizePath("/work/satellyte", "en")).toBe("/work/satellyte");
  });

  it("prefixes Indonesian paths", () => {
    expect(localizePath("/work/satellyte", "id")).toBe(
      "/id/work/satellyte",
    );
  });

  it("normalizes a missing leading slash", () => {
    expect(localizePath("work/satellyte", "id")).toBe(
      "/id/work/satellyte",
    );
  });

  it("localizes root paths without a trailing slash", () => {
    expect(localizePath("/", "en")).toBe("/");
    expect(localizePath("/", "id")).toBe("/id");
  });

  it("preserves hashes", () => {
    expect(localizePath("/#work", "id")).toBe("/id#work");
    expect(localizePath("/work#details", "en")).toBe("/work#details");
  });

  it("switches an existing supported locale instead of double-prefixing", () => {
    expect(localizePath("/id/work/satellyte", "id")).toBe(
      "/id/work/satellyte",
    );
    expect(localizePath("/id/work/satellyte#details", "en")).toBe(
      "/work/satellyte#details",
    );
    expect(localizePath("/en/work/satellyte", "id")).toBe(
      "/id/work/satellyte",
    );
  });

  it("treats an unsupported locale-like segment as part of the path", () => {
    expect(localizePath("/fr/work", "id")).toBe("/id/fr/work");
  });
});

describe("canonicalPath", () => {
  it("strips only a leading supported locale segment", () => {
    expect(canonicalPath("/id/work/satellyte")).toBe("/work/satellyte");
    expect(canonicalPath("/en/work/satellyte")).toBe("/work/satellyte");
    expect(canonicalPath("/fr/work/satellyte")).toBe("/fr/work/satellyte");
    expect(canonicalPath("/work/id/satellyte")).toBe(
      "/work/id/satellyte",
    );
  });

  it("normalizes root and missing leading slash paths", () => {
    expect(canonicalPath("/id")).toBe("/");
    expect(canonicalPath("id/work")).toBe("/work");
  });

  it("preserves hashes", () => {
    expect(canonicalPath("/id/work#details")).toBe("/work#details");
    expect(canonicalPath("/id#work")).toBe("/#work");
  });
});

describe("languageAlternates", () => {
  it("returns canonical English and prefixed Indonesian paths", () => {
    expect(languageAlternates("/work/satellyte")).toEqual({
      en: "/work/satellyte",
      id: "/id/work/satellyte",
    });
  });

  it("canonicalizes an already-localized path and preserves its hash", () => {
    expect(languageAlternates("/id/work#details")).toEqual({
      en: "/work#details",
      id: "/id/work#details",
    });
  });
});

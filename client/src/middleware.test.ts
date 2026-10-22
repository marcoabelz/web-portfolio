import { describe, expect, it } from "vitest";

import { config } from "@/middleware";

function middlewareMatches(pathname: string): boolean {
  return config.matcher.some((matcher) => new RegExp(`^${matcher}$`).test(pathname));
}

describe("locale middleware matcher", () => {
  it("keeps the homepage and Indonesian routes in locale middleware", () => {
    expect(middlewareMatches("/")).toBe(true);
    expect(middlewareMatches("/id")).toBe(true);
    expect(middlewareMatches("/id/work/palmgrade")).toBe(true);
  });

  it("localizes unprefixed work routes", () => {
    expect(middlewareMatches("/work")).toBe(true);
    expect(middlewareMatches("/work/archive")).toBe(true);
    expect(middlewareMatches("/work/palmgrade")).toBe(true);
  });

  it("does not localize the content editor", () => {
    // Left in, next-intl would send /admin to /en/admin, which is not a route.
    expect(middlewareMatches("/admin")).toBe(false);
    expect(middlewareMatches("/admin/")).toBe(false);
  });

  it("does not localize metadata and static asset routes", () => {
    expect(middlewareMatches("/opengraph-image")).toBe(false);
    expect(middlewareMatches("/robots.txt")).toBe(false);
    expect(middlewareMatches("/sitemap.xml")).toBe(false);
    expect(middlewareMatches("/favicon.ico")).toBe(false);
    expect(middlewareMatches("/icon.svg")).toBe(false);
    // Chips <use> the sprite by URL; a locale redirect would break every logo.
    expect(middlewareMatches("/icons.svg")).toBe(false);
  });
});

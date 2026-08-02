import { describe, expect, it } from "vitest";
import { getSiteUrl, SITE } from "@/lib/site";

describe("getSiteUrl", () => {
  it("uses the local URL when no value is provided", () => {
    expect(getSiteUrl(undefined).href).toBe("http://localhost:3000/");
  });

  it("returns an HTTPS origin without path, query, or hash", () => {
    expect(getSiteUrl("https://portfolio.example.com/work?draft=1#top").href).toBe(
      "https://portfolio.example.com/",
    );
  });

  it("uses the local URL when the value is invalid", () => {
    expect(getSiteUrl("not a url").href).toBe("http://localhost:3000/");
  });

  it.each([
    "ftp://portfolio.example.com",
    "javascript:alert(1)",
    "data:text/plain,test",
    "file:///tmp/index.html",
  ])("uses the local URL for unsafe protocols in non-production: %s", (value) => {
    expect(getSiteUrl(value, "test").href).toBe("http://localhost:3000/");
  });

  it.each([
    { kind: "missing", value: undefined },
    { kind: "malformed", value: "not a url" },
    { kind: "disallowed", value: "ftp://portfolio.example.com" },
  ])("throws for a $kind URL in production", ({ value }) => {
    expect(() => getSiteUrl(value, "production")).toThrow(
      "NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) origin in production.",
    );
  });

  it("stores the site URL as an immutable normalized HTTP(S) origin href string", () => {
    expect(typeof SITE.url).toBe("string");

    const siteUrl = new URL(SITE.url);
    expect(["http:", "https:"]).toContain(siteUrl.protocol);
    expect(siteUrl.hostname).not.toBe("");
    expect(SITE.url).toBe(new URL(siteUrl.origin).href);
  });
});

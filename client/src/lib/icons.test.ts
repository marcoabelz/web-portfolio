import { describe, expect, it, vi } from "vitest";

import { getContentFiles } from "@/lib/content/load";
import { ICON_SPRITE_URL, iconSpriteUrl } from "./icons-sprite";
import { iconSpriteVersion } from "./icons-version.mjs";
import { brandIcon, buildIconSprite, defaultMonogram, resolveTechTag, searchBrandIcons } from "./icons";

describe("icons", () => {
  it("resolves a brand icon by slug", () => {
    expect(brandIcon("react")).toMatchObject({ title: "React", path: expect.stringMatching(/^M/) });
    expect(brandIcon("definitely-not-a-slug")).toBeNull();
  });

  it.each([
    ["BullMQ", "BU"],
    ["SQL", "SQL"],
    ["C#", "C"],
    ["node red", "NO"],
    ["日本語", "日"],
    ["...", "."],
    ["", "?"],
  ])("default monogram for %s is %s", (name, text) => {
    expect(defaultMonogram(name)).toBe(text);
  });

  it("prefers the override, then the brand, then the default monogram", () => {
    const icons = [
      { name: "BullMQ", icon: null, monogram: "BQ" },
      { name: "React", icon: "react" },
      { name: "Gone", icon: "removed-slug" },
    ];
    expect(resolveTechTag("BullMQ", icons).icon).toEqual({ kind: "monogram", text: "BQ" });
    expect(resolveTechTag("React", icons).icon).toEqual({ kind: "brand", slug: "react", title: "React" });
    expect(resolveTechTag("Gone", icons).icon).toEqual({ kind: "monogram", text: "GO" });
    expect(resolveTechTag("Unlisted", icons).icon).toEqual({ kind: "monogram", text: "UN" });
  });

  it("every non-null slug in the content resolves", () => {
    for (const { icon } of getContentFiles().portfolio.skillIcons) {
      if (icon) expect(brandIcon(icon), icon).not.toBeNull();
    }
  });

  it("sprite holds one symbol per content slug and skips unknown slugs", () => {
    const slugs = getContentFiles().portfolio.skillIcons.flatMap(({ icon }) => (icon ? [icon] : []));
    const sprite = buildIconSprite([...slugs, ...slugs, "definitely-not-a-slug"]);
    for (const slug of Array.from(new Set(slugs))) expect(sprite).toContain(`<symbol id="si-${slug}" viewBox="0 0 24 24">`);
    expect(sprite.match(/<symbol /g)).toHaveLength(new Set(slugs).size);
    expect(sprite).not.toContain("definitely-not-a-slug");
    expect(sprite.startsWith('<svg xmlns="http://www.w3.org/2000/svg">')).toBe(true);
  });

  it("serves the sprite from a same-origin static route", async () => {
    const { GET, dynamic } = await import("@/app/icons.svg/route");
    expect(dynamic).toBe("force-static");
    expect(ICON_SPRITE_URL.startsWith("/icons.svg")).toBe(true);
    const response = GET();
    expect(response.headers.get("Content-Type")).toMatch(/^image\/svg\+xml/);
    expect(response.headers.get("Cache-Control")).toMatch(/max-age=\d+/);
    const body = await response.text();
    for (const { icon } of getContentFiles().portfolio.skillIcons) {
      if (icon) expect(body).toContain(`id="si-${icon}"`);
    }
  });

  it("versions the sprite URL by the sorted distinct slugs", () => {
    const base = iconSpriteVersion(["react", "nextdotjs", null, "react"]);
    expect(base).toMatch(/^[0-9a-f]{8}$/);
    expect(iconSpriteVersion(["nextdotjs", "react"])).toBe(base);
    expect(iconSpriteVersion(["nextdotjs", "react", "vercel"])).not.toBe(base);
    expect(iconSpriteUrl(base)).toBe(`/icons.svg?v=${base}`);
    expect(iconSpriteUrl(undefined)).toBe("/icons.svg");
  });

  it("takes the version from the build-time env constant", async () => {
    vi.stubEnv("NEXT_PUBLIC_ICON_SPRITE_VERSION", "abc12345");
    vi.resetModules();
    const mod = await import("./icons-sprite");
    expect(mod.ICON_SPRITE_URL).toBe("/icons.svg?v=abc12345");
    vi.unstubAllEnvs();
  });

  it("search ranks exact and prefix matches first", () => {
    expect(searchBrandIcons("next")[0].slug).toBe("nextdotjs");
  });
});

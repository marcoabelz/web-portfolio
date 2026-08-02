import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A language switch remounts the locale layout, and React clears the <html>
// attributes it does not own. The theme therefore has to ride on data-theme
// (which React never writes) instead of the className React does own.
describe("theme survives a locale switch", () => {
  it("keys the dark palette off data-theme everywhere", () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    const themeScript = read("./ThemeScript.tsx");
    const themeToggle = read("./ThemeToggle.tsx");
    const globalCss = read("../../app/globals.css");
    const tailwindConfig = read("../../../tailwind.config.ts");

    expect(themeScript).toContain("document.documentElement.dataset.theme");
    expect(themeToggle).toContain("root.dataset.theme");
    expect(globalCss).toContain('[data-theme="dark"]');
    expect(tailwindConfig).toContain('darkMode: ["selector", \'[data-theme="dark"]\']');

    expect(themeScript).not.toContain("classList");
    expect(themeToggle).not.toContain("classList");
  });

  // Dark is the site's own default, so only a saved "light" turns the palette off.
  it("ignores the operating system preference", () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    expect(read("./ThemeScript.tsx")).not.toContain("prefers-color-scheme");
    expect(read("./ThemeToggle.tsx")).not.toContain("prefers-color-scheme");
    expect(read("./ThemeToggle.tsx")).toContain('return "dark";');
  });

  it("restores the theme attribute when the remount drops it", () => {
    const source = readFileSync(new URL("./ThemeToggle.tsx", import.meta.url), "utf8");

    expect(source).toContain("if (!root.dataset.theme) root.dataset.theme = resolveStoredTheme();");
    // Restoring in a layout effect keeps the repaint from flashing light.
    expect(source).toContain("useLayoutEffect");
  });

  it("does not scroll the reader back to the hero on a locale switch", () => {
    const source = readFileSync(new URL("./LanguageSwitcher.tsx", import.meta.url), "utf8");

    expect(source).toContain("scroll={false}");
  });
});

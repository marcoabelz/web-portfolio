"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

const themeStorageKey = "portfolio-theme";

// Same rule as the pre-paint script in ThemeScript, which cannot be imported
// from because it has to run as an inline string before hydration.
export function resolveStoredTheme(): "dark" | "light" {
  try {
    if (localStorage.getItem(themeStorageKey) === "light") return "light";
  } catch {}

  return "dark";
}

// The restore below has to land before the browser paints the new language, and
// this component is server-rendered too, where layout effects do not run.
const useThemeRestoreEffect =
  typeof document === "undefined" ? useEffect : useLayoutEffect;

export type ThemeToggleLabels = Readonly<{
  switchToLightMode: string;
  switchToDarkMode: string;
  toggleColorTheme: string;
}>;

export function ThemeToggle({ labels }: { readonly labels: ThemeToggleLabels }) {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useThemeRestoreEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.dataset.theme === "dark");

    // A language switch remounts the locale layout, and React drops the
    // attributes it does not own on <html>, theme included.
    if (!root.dataset.theme) root.dataset.theme = resolveStoredTheme();

    syncTheme();
    setIsMounted(true);

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextIsDark = root.dataset.theme !== "dark";

    root.dataset.theme = nextIsDark ? "dark" : "light";
    setIsDark(nextIsDark);

    try {
      localStorage.setItem(themeStorageKey, nextIsDark ? "dark" : "light");
    } catch {}
  };

  const actionLabel = isMounted
    ? isDark
      ? labels.switchToLightMode
      : labels.switchToDarkMode
    : labels.toggleColorTheme;

  return (
    <button
      type="button"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
      onClick={toggleTheme}
      aria-label={actionLabel}
      title={actionLabel}
    >
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
    </button>
  );
}

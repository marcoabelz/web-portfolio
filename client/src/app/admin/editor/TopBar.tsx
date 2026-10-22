import { Search } from "lucide-react";
import type { Dispatch } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";

import type { EditorHandlers } from "./EditorLayout";
import type { EditorAction } from "./state";

const THEME_LABELS = {
  switchToLightMode: "Switch to light mode",
  switchToDarkMode: "Switch to dark mode",
  toggleColorTheme: "Toggle color theme",
} as const;

export function TopBar({
  query,
  repo,
  branch,
  dispatch,
  handlers,
}: Readonly<{
  query: string;
  repo: string;
  branch: string;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
}>) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
      <div className="min-w-0 mr-auto">
        <p className="font-display text-base font-semibold leading-tight">Content editor</p>
        <p className="truncate font-mono text-[11px] text-muted">
          {repo}@{branch}
        </p>
      </div>

      <label className="relative order-last w-full sm:order-none sm:w-72">
        <span className="sr-only">Search fields</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          placeholder="Search fields and text"
          onChange={(event) => dispatch({ type: "search", query: event.target.value })}
          className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
      </label>

      <button
        type="button"
        onClick={handlers.signOut}
        className="inline-flex h-10 items-center rounded-xl border border-line px-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
      >
        Sign out
      </button>
      <ThemeToggle labels={THEME_LABELS} />
    </header>
  );
}

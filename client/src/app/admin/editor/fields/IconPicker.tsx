import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { IconResult } from "@/lib/admin/media";

import { inputClass, smallButtonClass } from "./shared";

export const SEARCH_DELAY_MS = 250;

// A logo drawn from its own path, never from the site's sprite, which only holds the
// icons the published content already uses.
export function IconGlyph({ path, className = "size-5" }: Readonly<{ path: string; className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d={path} />
    </svg>
  );
}

export function IconPicker({
  name,
  current,
  monogram,
  search,
  onPick,
  onNone,
}: Readonly<{
  name: string;
  current: string | null;
  monogram: string;
  search(query: string): Promise<IconResult[]>;
  onPick(result: IconResult): void;
  onNone(monogram: string): void;
}>) {
  const id = useId();
  const [query, setQuery] = useState(name);
  const [results, setResults] = useState<IconResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  // Debounced, and only the latest query may write its results.
  useEffect(() => {
    const text = query.trim();

    if (!text) {
      setResults([]);
      setStatus("idle");
      return;
    }

    let live = true;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      search(text)
        .then((found) => {
          if (live) {
            setResults(found);
            setStatus("idle");
          }
        })
        .catch(() => live && setStatus("error"));
    }, SEARCH_DELAY_MS);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query, search]);

  return (
    <div data-icon-picker="true" className="space-y-3 rounded-xl border border-line bg-canvas p-3">
      <label htmlFor={`${id}-q`} className="sr-only">
        Search Simple Icons for {name}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          id={`${id}-q`}
          type="search"
          value={query}
          placeholder="Search Simple Icons"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          className={`${inputClass} pl-9`}
        />
      </div>
      <p role="status" className="text-xs text-muted">
        {status === "loading" ? "Searching…" : status === "idle" && query.trim() ? `${results.length} ${results.length === 1 ? "result" : "results"}` : ""}
      </p>
      <div aria-busy={status === "loading"}>
        {status === "loading" && results.length === 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} data-skeleton="true" className="h-16 rounded-lg bg-elevated motion-safe:animate-pulse" />
            ))}
          </div>
        ) : status === "error" ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">The search failed. Try again.</p>
        ) : results.length === 0 && query.trim() ? (
          <p className="text-xs text-muted">No logo matches that. Use a monogram below.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {results.map((result) => (
              <li key={result.slug}>
                <button
                  type="button"
                  aria-label={`Use ${result.title}`}
                  aria-pressed={result.slug === current}
                  onClick={() => onPick(result)}
                  className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-lg border border-line px-1 text-muted transition-colors hover:border-accent hover:text-accent aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-accent"
                >
                  <IconGlyph path={result.path} />
                  <span className="w-full truncate text-center text-[11px]">{result.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <button type="button" aria-pressed={current === null} onClick={() => onNone(monogram)} className={smallButtonClass}>
          No icon
        </button>
        <label className="flex items-center gap-2 text-xs text-muted">
          Monogram
          <input
            type="text"
            maxLength={3}
            value={monogram}
            placeholder="ABC"
            onChange={(event) => onNone(event.target.value.slice(0, 3).toUpperCase())}
            className={`${inputClass} w-20 font-mono uppercase`}
          />
        </label>
      </div>
    </div>
  );
}

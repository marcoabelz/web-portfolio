import type { Dispatch } from "react";

import type { EditorHandlers } from "./EditorLayout";
import type { EditorAction } from "./state";

export function SaveBar({
  changes,
  dispatch,
  handlers,
  status,
}: Readonly<{
  changes: number;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
  status?: { tone: "ok" | "error"; message: string } | null;
}>) {
  return (
    <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
      <p aria-live="polite" className="mr-auto text-sm">
        <span className={changes > 0 ? "font-medium text-ink" : "text-muted"}>
          {changes === 0 ? "No changes" : `${changes} ${changes === 1 ? "change" : "changes"}`}
        </span>
        {status ? (
          <span className={`ml-3 whitespace-pre-line ${status.tone === "ok" ? "text-muted" : "text-accent-strong"}`}>
            {status.message}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        data-action="discard"
        disabled={changes === 0}
        onClick={() => dispatch({ type: "discardAll" })}
        className="min-h-11 rounded-xl border border-line px-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-muted"
      >
        Discard
      </button>
      <button
        type="button"
        data-action="publish"
        disabled={changes === 0}
        onClick={handlers.review}
        className="min-h-11 rounded-xl bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50 dark:text-canvas"
      >
        Review and publish
      </button>
    </footer>
  );
}

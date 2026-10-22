// The offer to bring back a draft kept in this browser. It sits in the editor's banner
// slot; presentational only, so the root decides what Restore and Discard do.

export function relativeTime(savedAt: string, now: number): string {
  const then = Date.parse(savedAt);

  if (Number.isNaN(then)) {
    return "earlier";
  }

  const minutes = Math.max(0, Math.round((now - then) / 60_000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  }

  const days = Math.round(hours / 24);

  return days === 1 ? "a day ago" : `${days} days ago`;
}

export function RestorePrompt({
  savedAt,
  now,
  siteChanged,
  rebased = false,
  conflicts = [],
  onRestore,
  onDiscard,
}: Readonly<{
  savedAt: string;
  now: number;
  // The site moved on since the draft was saved, so restoring may overwrite newer work.
  siteChanged: boolean;
  // Restore re-applies only this draft's own edits onto the current site.
  rebased?: boolean;
  // Fields changed both here and on the site since; this draft's value is kept.
  conflicts?: readonly string[];
  onRestore(): void;
  onDiscard(): void;
}>) {
  return (
    <div role="alert" data-restore className="flex flex-wrap items-center gap-3 border-b border-line bg-elevated px-4 py-2.5 text-sm sm:px-6">
      <p className="mr-auto min-w-0">
        You have unpublished changes from {relativeTime(savedAt, now)}. Restore them?
        {siteChanged && rebased ? (
          <span className="mt-0.5 block text-muted">
            The site changed since this draft was saved. Restore applies only your edits on top of it.
          </span>
        ) : siteChanged ? (
          <span className="mt-0.5 block text-muted">
            The site changed since this draft was saved; review carefully before publishing.
          </span>
        ) : null}
        {conflicts.length > 0 ? (
          <span className="mt-1 block text-muted" data-restore-conflicts>
            Also changed on the site, your version is kept:
            <span className="mt-0.5 block">
              {conflicts.map((path) => (
                <code key={path} className="mr-2 inline-block font-mono text-xs">
                  {path}
                </code>
              ))}
            </span>
          </span>
        ) : null}
      </p>
      <button
        type="button"
        className="min-h-9 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-canvas"
        onClick={onRestore}
      >
        Restore
      </button>
      <button
        type="button"
        className="min-h-9 rounded-lg border border-line px-3 text-sm text-muted hover:border-accent hover:text-accent"
        onClick={onDiscard}
      >
        Discard
      </button>
    </div>
  );
}

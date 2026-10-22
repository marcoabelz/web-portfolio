"use client";

import { useEffect, useRef } from "react";

import type { Change } from "@/lib/admin/diff";
import type { ContentDraft } from "@/lib/admin/draft";
import { EDITOR_SECTIONS } from "@/lib/admin/schema";
import type { ContentIssue } from "@/lib/content/validate";

import { issueLabel, type Review } from "./review";

// What came back from the last publish attempt. `published` ends the review; the rest
// leave the draft where it is.
export type PublishOutcome =
  | { kind: "published"; sha: string }
  | { kind: "invalid"; issues: ContentIssue[] }
  | { kind: "conflict" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

const LOCALE_NAMES = { en: "English", id: "Indonesian" } as const;
const KIND_WORDS: Record<Change["kind"], string> = { edited: "Edited", added: "Added", removed: "Removed", moved: "Moved" };

const primary =
  "min-h-11 rounded-xl bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50 dark:text-canvas";
const secondary =
  "inline-flex min-h-11 items-center rounded-xl border border-line px-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

function thumbnailFor(change: Change, previews: Readonly<Record<string, string>>): string | undefined {
  if (change.kind !== "added" || !change.after) {
    return undefined;
  }

  const key = Object.keys(previews).find((publicPath) => change.after?.includes(publicPath));

  return key ? previews[key] : undefined;
}

function ChangeRow({ change, previews }: Readonly<{ change: Change; previews: Readonly<Record<string, string>> }>) {
  const preview = thumbnailFor(change, previews);

  return (
    <li data-change={change.kind} className="rounded-xl border border-line bg-canvas p-3 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium break-words">{change.label}</span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {KIND_WORDS[change.kind]}
          {change.locale ? ` · ${LOCALE_NAMES[change.locale]}` : ""}
        </span>
      </p>
      {change.before !== undefined ? (
        <p data-before className="mt-1.5 break-words text-muted line-through decoration-muted/60">
          {change.before === "" ? "(empty)" : change.before}
        </p>
      ) : null}
      {change.after !== undefined ? (
        <p data-after className="mt-1 break-words">
          {change.after === "" ? "(empty)" : change.after}
        </p>
      ) : null}
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob URL has nothing to optimise
        <img src={preview} alt="" className="mt-2 h-20 w-auto max-w-full rounded-lg border border-line object-cover" />
      ) : null}
    </li>
  );
}

export function ReviewDialog({
  review,
  draft,
  open,
  repo,
  publishing = false,
  outcome = null,
  previews = {},
  onPublish,
  onClose,
  onReload,
}: Readonly<{
  review: Review;
  // Used to name the entry an issue is about.
  draft: ContentDraft;
  open: boolean;
  repo: string;
  publishing?: boolean;
  outcome?: PublishOutcome | null;
  // Object URLs of uploads made in this session, keyed by the path the draft uses.
  previews?: Readonly<Record<string, string>>;
  onPublish(): void;
  onClose(): void;
  onReload?(): void;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  // showModal moves focus into the dialog; the element that opened it gets focus back
  // when it closes, which the browser does not do once the dialog has been unmounted
  // or closed by a state change.
  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      heading.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }

    if (!open && trigger.current) {
      const target = trigger.current;

      trigger.current = null;

      if (target.isConnected) {
        target.focus();
      }
    }
  }, [open]);

  const published = outcome?.kind === "published" ? outcome : null;
  const issues = outcome?.kind === "invalid" ? outcome.issues : review.issues;
  const blocked = issues.length > 0;
  const nothing = !blocked && !review.canPublish;
  const finished = published !== null || outcome?.kind === "conflict" || outcome?.kind === "signed-out";

  return (
    <dialog
      ref={ref}
      aria-labelledby="review-title"
      // Escape is a way out except while the commit is in flight.
      onCancel={(event) => {
        if (publishing) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      className="m-auto w-[min(46rem,calc(100vw-1.5rem))] max-w-none flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 open:flex max-h-[calc(100dvh-1.5rem)]"
    >
      {open ? (
        <>
          <header className="border-b border-line px-5 py-4">
            <h2 id="review-title" ref={heading} tabIndex={-1} className="font-display text-xl font-semibold tracking-tight outline-none">
              Review and publish
            </h2>
            {!finished ? (
              <p className="mt-1 text-sm text-muted">
                {review.groups.length === 0 ? "Check what will be committed." : `${review.groups.reduce((n, g) => n + g.changes.length, 0)} changes in ${review.groups.length} ${review.groups.length === 1 ? "section" : "sections"}.`}
              </p>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {published ? (
              <div role="status" data-outcome="published" className="space-y-3 text-sm">
                <p>Published. The site updates after the next deploy finishes, usually about a minute.</p>
                <a
                  href={`https://github.com/${repo}/commit/${published.sha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-medium text-accent hover:underline"
                >
                  View commit
                </a>
              </div>
            ) : null}

            {outcome?.kind === "conflict" ? (
              <p role="alert" data-outcome="conflict" className="text-sm">
                The site changed since you opened the editor. Your draft is saved in this browser. Reload to apply it again.
              </p>
            ) : null}

            {outcome?.kind === "signed-out" ? (
              <p role="alert" data-outcome="signed-out" className="text-sm">
                Your session expired. Your draft is saved in this browser. Sign in again to restore it.
              </p>
            ) : null}

            {outcome?.kind === "error" ? (
              <p role="alert" data-outcome="error" className="text-sm text-red-700 dark:text-red-300">
                {outcome.message}
              </p>
            ) : null}

            {!finished && blocked ? (
              <section data-issues role="alert" aria-label="Issues" className="rounded-xl border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-800 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-200">
                <h3 className="font-medium">Fix these before publishing</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {issues.map((issue, index) => (
                    <li key={`${issue.file}:${issue.path}:${index}`} className="break-words">
                      {issueLabel(issue, EDITOR_SECTIONS, draft)}
                    </li>
                  ))}
                </ul>
                {review.moreChecks && outcome?.kind !== "invalid" ? (
                  <p className="mt-2">More checks run after these are fixed.</p>
                ) : null}
              </section>
            ) : null}

            {!finished ? (
              <section data-changes aria-label="Changes" className="space-y-5">
                {review.groups.map((group) => (
                  <div key={group.sectionId} data-group={group.sectionId}>
                    <h3 className="font-mono text-xs uppercase tracking-wider text-muted">{group.title}</h3>
                    <ul className="mt-2 space-y-2">
                      {group.changes.map((change, index) => (
                        <ChangeRow key={`${change.label}:${change.locale ?? ""}:${index}`} change={change} previews={previews} />
                      ))}
                    </ul>
                  </div>
                ))}
                {review.groups.length === 0 && review.unlisted ? (
                  <p data-unlisted className="rounded-xl border border-line bg-canvas p-3 text-sm">
                    Formatting or unlisted changes
                  </p>
                ) : null}
                {nothing ? <p className="text-sm text-muted">Nothing to publish.</p> : null}
              </section>
            ) : null}

            {!finished ? (
              <section aria-label="Commit message">
                <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Commit message</h3>
                <p data-message className="mt-2 break-words rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-xs">
                  {review.message}
                </p>
              </section>
            ) : null}
          </div>

          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
            {publishing ? (
              <span role="status" className="mr-auto inline-flex items-center gap-2 text-sm text-muted">
                <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" />
                Sending to GitHub
              </span>
            ) : null}
            {outcome?.kind === "conflict" ? (
              <button type="button" className={primary} onClick={onReload}>
                Reload
              </button>
            ) : null}
            {outcome?.kind === "signed-out" ? (
              <a href="/admin" className={`${primary} inline-flex items-center`}>
                Sign in
              </a>
            ) : null}
            <button type="button" className={secondary} disabled={publishing} onClick={onClose}>
              {finished ? "Close" : "Cancel"}
            </button>
            {!finished ? (
              <button type="button" className={primary} disabled={publishing || blocked || !review.canPublish} onClick={onPublish}>
                {publishing ? "Publishing…" : "Publish"}
              </button>
            ) : null}
          </footer>
        </>
      ) : null}
    </dialog>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";

import type { Locale } from "@/i18n/locale";
import {
  appendItem,
  MESSAGE_DOMAINS,
  removeItem,
  updateLeaf,
  type MessageDraft,
  type MessageNode,
  type NodePath,
} from "@/lib/admin/draft";

import { logout, saveDraft } from "./actions";
import { Fields, ghostButtonClassName } from "./Fields";

type Domain = (typeof MESSAGE_DOMAINS)[number];

export function Editor({
  initialDraft,
  branch,
}: Readonly<{ initialDraft: MessageDraft; branch: string }>) {
  const [draft, setDraft] = useState(initialDraft);
  const [domain, setDomain] = useState<Domain>(MESSAGE_DOMAINS[0]);
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  // Closing the tab mid-edit would otherwise throw away every field typed since the
  // last save, with nothing on the server to recover from.
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const editLeaf = (locale: Locale, path: NodePath, value: string) => {
    setIsDirty(true);
    setDraft((current) => ({
      ...current,
      [locale]: {
        ...current[locale],
        [domain]: updateLeaf(current[locale][domain], path, value),
      },
    }));
  };

  // Structure changes always run on both languages at once. That is what makes the
  // en/id parity the site's tests require impossible to break from this editor.
  const editStructure = (change: (node: MessageNode) => MessageNode) => {
    setIsDirty(true);
    setDraft((current) => ({
      en: { ...current.en, [domain]: change(current.en[domain]) },
      id: { ...current.id, [domain]: change(current.id[domain]) },
    }));
  };

  const save = () => {
    startSaving(async () => {
      const result = await saveDraft(draft);

      setStatus({ tone: result.ok ? "ok" : "error", message: result.message });

      if (result.ok) {
        setIsDirty(false);
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Content editor</h1>
            <p className="text-sm text-muted">
              Saving commits to <span className="font-mono">{branch}</span> and the site rebuilds
              itself.
            </p>
          </div>
          <form action={logout}>
            <button type="submit" className={ghostButtonClassName}>
              Sign out
            </button>
          </form>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Message files">
          {MESSAGE_DOMAINS.map((name) => (
            <button
              key={name}
              type="button"
              aria-current={name === domain}
              className={`min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors ${
                name === domain
                  ? "border-accent bg-accent text-white"
                  : "border-line text-muted hover:border-accent hover:text-accent"
              }`}
              onClick={() => setDomain(name)}
            >
              {name}.json
            </button>
          ))}
        </nav>
      </header>

      <Fields
        path={[]}
        english={draft.en[domain]}
        indonesian={draft.id[domain]}
        onEdit={editLeaf}
        onAdd={(path) => editStructure((node) => appendItem(node, path))}
        onRemove={(path, index) => editStructure((node) => removeItem(node, path, index))}
      />

      {/* Every tab edits one shared draft and one save commits all six files, so the
          bar stays visible instead of living at the bottom of the active tab. */}
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-canvas/95 py-4 backdrop-blur">
        <button
          type="button"
          className="min-h-11 rounded-lg bg-accent px-5 font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
          onClick={save}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? "Saving…" : "Save and publish"}
        </button>
        <button
          type="button"
          className={ghostButtonClassName}
          onClick={() => {
            setDraft(initialDraft);
            setIsDirty(false);
            setStatus(null);
          }}
          disabled={isSaving || !isDirty}
        >
          Discard changes
        </button>
        {status ? (
          <p
            role="status"
            className={`text-sm ${status.tone === "ok" ? "text-muted" : "text-accent-strong"}`}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

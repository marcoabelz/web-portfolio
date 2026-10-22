import type { Dispatch, ReactNode } from "react";

import type { IconResult } from "@/lib/admin/media";
import { uncoveredCopyPaths, type FactRef, type SectionDef } from "@/lib/admin/schema";

import { SaveBar } from "./SaveBar";
import { filterFields } from "./search";
import { SectionPanel } from "./SectionPanel";
import { Sidebar } from "./Sidebar";
import { dirtySectionIds, type EditorAction, type EditorState } from "./state";
import { TopBar } from "./TopBar";

export type EditorHandlers = {
  // Resolves to an error message, or null once the upload is attached.
  upload(kind: "image" | "resume", file: File, target: FactRef): Promise<string | null>;
  searchIcons(query: string): Promise<IconResult[]>;
  review(): void;
  signOut(): void;
};

export function EditorLayout({
  state,
  dispatch,
  handlers,
  repo,
  branch,
  sections,
  status,
  changes,
  banner,
  overlay,
}: Readonly<{
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
  repo: string;
  branch: string;
  // The schema's sections, with "Other" last when some copy is not covered.
  sections: readonly SectionDef[];
  status?: { tone: "ok" | "error"; message: string } | null;
  // Computed once by the root (countChanges of the diff) and shared with the save bar.
  changes: number;
  // Sits inside the viewport-high column, so it never pushes the save bar off screen.
  banner?: ReactNode;
  // Modal UI (the review dialog) rendered once at the end of the column.
  overlay?: ReactNode;
}>) {
  const active = sections.find((section) => section.id === state.section) ?? sections[0];
  const dirty = dirtySectionIds(state);
  const searching = state.query.trim() !== "";
  const hits = searching ? filterFields(sections, state.draft, state.query) : [];
  const fieldCount = hits.reduce((sum, hit) => sum + hit.fieldLabels.length, 0);
  const titles = new Map(sections.map((section) => [section.id, section.title]));
  const uncovered = active.id === "other" ? uncoveredCopyPaths(sections.filter((s) => s.id !== "other"), state.draft) : [];

  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <TopBar
        query={state.query}
        repo={repo}
        branch={branch}
        dispatch={dispatch}
        handlers={handlers}
      />
      {banner}

      <div className="border-b border-line bg-surface px-4 py-2 min-[960px]:hidden">
        <label className="block">
          <span className="sr-only">Section</span>
          <select
            aria-label="Section"
            value={active.id}
            onChange={(event) => dispatch({ type: "selectSection", id: event.target.value })}
            className="h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {dirty.has(section.id) ? `${section.title} (changed)` : section.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex min-h-0 flex-1">
        <Sidebar sections={sections} active={active.id} dirty={dirty} dispatch={dispatch} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          {searching ? (
            <section data-search-results="true" aria-label="Search results" className="mx-auto w-full max-w-3xl">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Search</h1>
              <p className="mt-1 text-sm text-muted">
                {hits.length === 0
                  ? "Nothing matches that."
                  : `${fieldCount} ${fieldCount === 1 ? "field" : "fields"} in ${hits.length} ${hits.length === 1 ? "section" : "sections"}`}
              </p>
              <div className="mt-6 space-y-4">
                {hits.map((hit) => (
                  <div key={hit.sectionId} data-result-section={hit.sectionId} className="rounded-2xl border border-line bg-surface p-4">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: "search", query: "" });
                        dispatch({ type: "selectSection", id: hit.sectionId });
                      }}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      {titles.get(hit.sectionId)}
                    </button>
                    <ul className="mt-2 space-y-1 text-sm text-muted">
                      {hit.fieldLabels.slice(0, 8).map((label) => (
                        <li key={label} className="break-words">{label}</li>
                      ))}
                      {hit.fieldLabels.length > 8 ? <li>and {hit.fieldLabels.length - 8} more</li> : null}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <SectionPanel section={active} state={state} dispatch={dispatch} handlers={handlers} uncovered={uncovered} />
          )}
        </main>
      </div>

      <SaveBar changes={changes} dispatch={dispatch} handlers={handlers} status={status} />
      {overlay}
    </div>
  );
}

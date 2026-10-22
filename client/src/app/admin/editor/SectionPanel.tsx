import { ExternalLink } from "lucide-react";
import type { Dispatch } from "react";

import type { SectionDef } from "@/lib/admin/schema";

import { Fields } from "../Fields";

import type { EditorHandlers } from "./EditorLayout";
import { FieldRenderer } from "./fields/FieldRenderer";
import type { EditorAction, EditorState } from "./state";

export function SectionPanel({
  section,
  state,
  dispatch,
  handlers,
  uncovered,
}: Readonly<{
  section: SectionDef;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
  // Message paths no section reaches; listed only in the "Other" section.
  uncovered: readonly string[];
}>) {
  return (
    <section aria-labelledby="section-title" data-section-panel={section.id} className="mx-auto w-full max-w-3xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 id="section-title" className="font-display text-2xl font-semibold tracking-tight">
            {section.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{section.where}</p>
        </div>
        <a
          href={section.viewPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          View site
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </header>

      <div className="space-y-4">
        {section.fields.map((field, index) => (
          <FieldRenderer
            key={`${field.kind}-${field.label}-${index}`}
            field={field}
            scope={{ copyBase: [] }}
            state={state}
            dispatch={dispatch}
            handlers={handlers}
          />
        ))}
        {section.id === "other" ? <Fields paths={uncovered} state={state} dispatch={dispatch} handlers={handlers} /> : null}
      </div>
    </section>
  );
}

import type { Dispatch } from "react";

import type { SectionDef } from "@/lib/admin/schema";

import type { EditorAction } from "./state";

export function Sidebar({
  sections,
  active,
  dirty,
  dispatch,
}: Readonly<{
  sections: readonly SectionDef[];
  active: string;
  dirty: ReadonlySet<string>;
  dispatch: Dispatch<EditorAction>;
}>) {
  return (
    <nav
      aria-label="Site sections"
      data-sidebar="true"
      className="hidden w-[260px] shrink-0 overflow-y-auto border-r border-line bg-surface p-3 min-[960px]:block"
    >
      <ul className="space-y-0.5">
        {sections.map((section) => {
          const isActive = section.id === active;

          return (
            <li key={section.id}>
              <button
                type="button"
                data-section-id={section.id}
                data-dirty={dirty.has(section.id) ? "true" : "false"}
                aria-current={isActive ? "page" : undefined}
                onClick={() => dispatch({ type: "selectSection", id: section.id })}
                className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors ${
                  isActive ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-elevated hover:text-ink"
                }`}
              >
                <span className="truncate">{section.title}</span>
                {dirty.has(section.id) ? (
                  <>
                  <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span className="sr-only">Unsaved changes</span>
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

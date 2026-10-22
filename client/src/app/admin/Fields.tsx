"use client";

import type { Dispatch } from "react";

import type { MessageDomain } from "@/i18n/messages";
import { MESSAGE_DOMAINS } from "@/lib/admin/draft";
import type { CopyRef } from "@/lib/admin/schema";

import type { EditorHandlers } from "./editor/EditorLayout";
import { CopyField } from "./editor/fields/CopyField";
import { copyValue } from "./editor/fields/shared";
import type { EditorAction, EditorState } from "./editor/state";

// The "Other" section: copy that no section of the schema reaches, so a key added to a
// message file is still editable before anyone gives it a proper field. Kept free of
// server actions so it can be render-tested.

export function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// "common.labels.portfolio" or "projects.selected.satellyte.screenshots[2]".
export function parseCopyPath(text: string): CopyRef | null {
  const [domain, ...rest] = Array.from(text.matchAll(/([^.[\]]+)|\[(\d+)\]/g)).map((match) =>
    match[2] !== undefined ? Number(match[2]) : match[1],
  );

  if (typeof domain !== "string" || !(MESSAGE_DOMAINS as readonly string[]).includes(domain) || rest.length === 0) {
    return null;
  }

  return { domain: domain as MessageDomain, path: rest };
}

function labelOf(ref: CopyRef): string {
  const key = [...ref.path].reverse().find((part): part is string => typeof part === "string");

  return humanize(key ?? "Text");
}

export function Fields({
  paths,
  state,
  dispatch,
  handlers,
}: Readonly<{
  paths: readonly string[];
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
}>) {
  return (
    <div data-uncovered="true" className="space-y-4">
      {paths.map((text) => {
        const ref = parseCopyPath(text);

        if (!ref) {
          return null;
        }

        const english = copyValue(state.draft, "en", ref);
        // Long copy gets a growing textarea, short copy a single line.
        const long = typeof english === "string" && english.length > 90;

        return (
          <CopyField
            key={text}
            field={{ kind: long ? "paragraph" : "text", label: labelOf(ref), hint: text, copy: ref }}
            scope={{ copyBase: [] }}
            state={state}
            dispatch={dispatch}
            handlers={handlers}
          />
        );
      })}
    </div>
  );
}

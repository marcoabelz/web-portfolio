import type { Dispatch, ReactNode } from "react";

import type { ContentDraft } from "@/lib/admin/draft";
import { placeholdersOf } from "@/lib/admin/draft";
import { resolveFactPath, type CopyRef, type FactRef, type FieldDef } from "@/lib/admin/schema";

import type { EditorHandlers } from "../EditorLayout";
import type { EditorAction, EditorState } from "../state";

// Where a field's relative paths start: the entry of a collection or the item of a list
// it sits in. Top-level fields use an empty scope. Fact bases use array indexes, which
// are recomputed on every render, so a move never leaves a field on the wrong entry.
export type FieldScope = {
  copyBase: readonly (string | number)[];
  factBase?: readonly (string | number)[];
};

export type FieldProps<K extends FieldDef["kind"] = FieldDef["kind"]> = Readonly<{
  field: Extract<FieldDef, { kind: K }>;
  scope: FieldScope;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
  // Extra buttons for the field's header, such as a list item's move and remove.
  actions?: ReactNode;
}>;

export function readAt(node: unknown, path: readonly (string | number)[]): unknown {
  let current = node;

  for (const part of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string | number, unknown>)[part];
  }

  return current;
}

export function copyRefIn(ref: CopyRef, scope: FieldScope): CopyRef {
  return { domain: ref.domain, path: [...scope.copyBase, ...ref.path] };
}

export function factRefIn(ref: FactRef, scope: FieldScope): FactRef {
  return { file: ref.file, path: [...(scope.factBase ?? []), ...ref.path] };
}

export function factValue(draft: ContentDraft, ref: FactRef): unknown {
  const root = draft.content[ref.file];
  const path = resolveFactPath(root, ref.path);

  return path ? readAt(root, path) : undefined;
}

export function copyValue(draft: ContentDraft, locale: "en" | "id", ref: CopyRef): unknown {
  return readAt(draft.messages[locale][ref.domain], ref.path);
}

// Indonesian left empty, or still equal to the English, has not been translated yet.
export function translationStatus(english: string, indonesian: string): "ok" | "untranslated" {
  if (english.trim() === "") {
    return "ok";
  }

  return indonesian.trim() === "" || indonesian.trim() === english.trim() ? "untranslated" : "ok";
}

export function placeholderStatus(english: string, indonesian: string): { tokens: string[]; differ: boolean } {
  const en = placeholdersOf(english);
  const id = placeholdersOf(indonesian);

  return { tokens: Array.from(new Set(en)), differ: en.join("|") !== id.join("|") };
}

// Typed text may hold several comma-separated tags; blanks and repeats are dropped.
export function addTags(current: readonly string[], typed: string): string[] {
  const next = [...current];

  for (const part of typed.split(",")) {
    const tag = part.trim();

    if (tag && !next.includes(tag)) {
      next.push(tag);
    }
  }

  return next;
}

// Every skill name the content mentions, for tag suggestions.
export function knownSkills(draft: ContentDraft): string[] {
  const { site, portfolio, projects } = draft.content;
  const names = new Set<string>([
    ...site.dailyStack,
    ...portfolio.skillIcons.map((icon) => icon.name),
    ...portfolio.skillGroups.flatMap((group) => group.skills),
    ...portfolio.experiences.flatMap((role) => role.stack),
    ...projects.selected.flatMap((app) => app.stack),
    ...projects.archive.flatMap((project) => project.stack),
    ...portfolio.lab.flatMap((entry) => ("stack" in entry ? entry.stack : [])),
  ]);

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function moved<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;

  if (target < 0 || target >= items.length) {
    return [...items];
  }

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];

  return next;
}

export function removeConfirmText(title: string): string {
  return `Remove ${title}? This also removes its text in both languages.`;
}

// ------------------------------------------------------------------ class names

export const inputClass =
  "w-full min-w-0 rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 aria-[invalid=true]:border-amber-500";

export const smallButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted";

export const iconButtonClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted";

export const badgeClass = "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium";

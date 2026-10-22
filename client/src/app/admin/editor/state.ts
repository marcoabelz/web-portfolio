import type { Locale } from "@/i18n/locale";

import type { MessageNode } from "@/lib/content/catalog";
import type { CollectionId } from "@/lib/content/collections";
import { diffDraft } from "@/lib/admin/diff";
import { MESSAGE_LOCALES, referencedMedia, type ContentDraft, type PendingMedia } from "@/lib/admin/draft";
import {
  addCopyItem,
  addEntry,
  moveCopyItem,
  moveEntry,
  removeCopyItem,
  removeEntry,
  setCopy,
  setAppPrivacy,
  setCoverKind,
  setFact,
  setLabSource,
} from "@/lib/admin/operations";
import { resolveFactPath, type CopyRef, type FactRef } from "@/lib/admin/schema";

// The editor's whole state transition, kept pure so it can be tested without a browser.
// `base` is what the repository holds; `draft` is what the editor is changing.

export type FieldPath = { scope: "copy"; ref: CopyRef } | { scope: "fact"; ref: FactRef };

export type EditorState = {
  base: ContentDraft;
  draft: ContentDraft;
  baseSha: string;
  publicFiles: string[];
  section: string;
  query: string;
  previews: Record<string, string>;
};

export type EditorAction =
  | { type: "setCopy"; locale: Locale; ref: CopyRef; value: string }
  | { type: "setFact"; ref: FactRef; value: unknown }
  | { type: "setCoverKind"; ref: FactRef; kind: "pattern" | "image" }
  | { type: "setAppPrivacy"; slug: string; privacy: "public" | "private" }
  | { type: "setLabSource"; id: string; source: "repo" | "archive" }
  | { type: "addEntry"; collection: CollectionId; seed: { name: string } }
  | { type: "removeEntry"; collection: CollectionId; id: string }
  | { type: "moveEntry"; collection: CollectionId; id: string; direction: -1 | 1 }
  | { type: "addCopyItem"; ref: CopyRef; template: MessageNode }
  | { type: "removeCopyItem"; ref: CopyRef; index: number }
  | { type: "moveCopyItem"; ref: CopyRef; index: number; direction: -1 | 1 }
  | {
      type: "attachMedia";
      media: PendingMedia & { kind: "image" };
      target: FactRef;
      size: { width: number; height: number };
      preview: string;
    }
  | { type: "attachMedia"; media: PendingMedia & { kind: "resume" }; preview: string }
  | { type: "resetField"; path: FieldPath }
  | { type: "discardAll" }
  | { type: "selectSection"; id: string }
  | { type: "search"; query: string }
  | { type: "restore"; draft: ContentDraft }
  | { type: "published"; draft: ContentDraft; baseSha: string };

function read(node: unknown, path: readonly (string | number)[]): unknown {
  let current = node;

  for (const part of path) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    current = (current as Record<string | number, unknown>)[part];
  }

  return current;
}

function factValue(draft: ContentDraft, ref: FactRef): unknown {
  const root = draft.content[ref.file];
  const path = resolveFactPath(root, ref.path);

  return path ? read(root, path) : undefined;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function factInBase(state: EditorState, ref: FactRef): boolean {
  return resolveFactPath(state.base.content[ref.file], ref.path.slice(0, -1)) !== undefined;
}

function copyInBase(state: EditorState, ref: CopyRef): boolean {
  return MESSAGE_LOCALES.some(
    (locale) => read(state.base.messages[locale][ref.domain], ref.path.slice(0, -1)) !== undefined,
  );
}

// A field inside an entry added this session has no repository value to go back to, so it
// is never "dirty": its reset button stays hidden and the entry shows up as added instead.
export function isFieldDirty(state: EditorState, path: FieldPath): boolean {
  if (path.scope === "fact") {
    return factInBase(state, path.ref) && !same(factValue(state.base, path.ref), factValue(state.draft, path.ref));
  }

  const { domain, path: at } = path.ref;

  return (
    copyInBase(state, path.ref) &&
    MESSAGE_LOCALES.some(
      (locale) => !same(read(state.base.messages[locale][domain], at), read(state.draft.messages[locale][domain], at)),
    )
  );
}

// Derived from the same diff the review screen shows, so the sidebar dots and the
// review can never disagree.
export function dirtySectionIds(state: EditorState): ReadonlySet<string> {
  return new Set(diffDraft(state.base, state.draft).map((group) => group.sectionId));
}

function isImageShaped(value: unknown): boolean {
  const image = value as { src?: unknown; width?: unknown; height?: unknown } | null | undefined;

  return (
    typeof image === "object" &&
    image !== null &&
    typeof image.src === "string" &&
    typeof image.width === "number" &&
    typeof image.height === "number"
  );
}

function resetField(state: EditorState, path: FieldPath): ContentDraft {
  if (path.scope === "copy") {
    if (!isFieldDirty(state, path)) {
      return state.draft;
    }

    return MESSAGE_LOCALES.reduce((draft, locale) => {
      const original = read(state.base.messages[locale][path.ref.domain], path.ref.path);

      return typeof original === "string" ? setCopy(draft, locale, path.ref, original) : draft;
    }, state.draft);
  }

  if (!factInBase(state, path.ref)) {
    return state.draft;
  }

  // An image is one unit: src, width and height go back together, or the old aspect ratio is lost.
  // Only when the parent really is an image object, never for a lone width/height elsewhere.
  const last = path.ref.path[path.ref.path.length - 1];
  const parent: FactRef = { file: path.ref.file, path: path.ref.path.slice(0, -1) };
  const grouped =
    path.ref.path.length > 1 &&
    (last === "src" || last === "width" || last === "height") &&
    (isImageShaped(factValue(state.base, parent)) || isImageShaped(factValue(state.draft, parent)));
  const ref = grouped ? parent : path.ref;

  // Nothing differs from the repository: keep the very same draft.
  if (same(factValue(state.base, ref), factValue(state.draft, ref))) {
    return state.draft;
  }
  const next = setFact(state.draft, ref, factValue(state.base, ref));

  // An image put back to its published picture no longer needs the upload that replaced it.
  const used = new Set(referencedMedia(next.content));

  return { ...next, media: next.media.filter((entry) => entry.kind !== "image" || used.has(entry.publicPath)) };
}

// Object URLs of previews that `next` no longer holds, for the editor to revoke.
export function stalePreviewUrls(prev: Record<string, string>, next: Record<string, string>): string[] {
  const kept = new Set(Object.values(next));

  return Object.values(prev).filter((url) => !kept.has(url));
}

function prune(previews: Record<string, string>, draft: ContentDraft): Record<string, string> {
  const live = new Set(draft.media.map((entry) => entry.publicPath));

  return Object.fromEntries(Object.entries(previews).filter(([publicPath]) => live.has(publicPath)));
}

function withDraft(state: EditorState, draft: ContentDraft): EditorState {
  return { ...state, draft, previews: prune(state.previews, draft) };
}

function attach(state: EditorState, action: Extract<EditorAction, { type: "attachMedia" }>): EditorState {
  const { media, preview } = action;
  let draft = state.draft;

  if (media.kind === "image") {
    const { target, size } = action as Extract<EditorAction, { type: "attachMedia" }> & { target: FactRef; size: object };
    const current = factValue(draft, target);
    const object = typeof current === "object" && current !== null && !Array.isArray(current) ? current : {};
    const written = setFact(draft, target, { ...object, src: media.publicPath, ...size });

    // The target is gone (a stale reference): keep no orphan upload or preview.
    if (written === draft) {
      return state;
    }

    draft = written;
  }

  return {
    ...state,
    draft: { ...draft, media: [...draft.media.filter((entry) => entry.repoPath !== media.repoPath), media] },
    previews: { ...state.previews, [media.publicPath]: preview },
  };
}

// Dropping screenshots can orphan an upload, so its preview is pruned with the draft.
function withDraftIfChanged(state: EditorState, draft: ContentDraft): EditorState {
  if (draft === state.draft) {
    return state;
  }

  const used = new Set(referencedMedia(draft.content));

  return withDraft(state, { ...draft, media: draft.media.filter((entry) => entry.kind !== "image" || used.has(entry.publicPath)) });
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const edit = (draft: ContentDraft): EditorState => (draft === state.draft ? state : { ...state, draft });

  switch (action.type) {
    case "setCopy":
      return edit(setCopy(state.draft, action.locale, action.ref, action.value));
    case "setFact":
      return edit(setFact(state.draft, action.ref, action.value));
    case "setCoverKind":
      return edit(setCoverKind(state.draft, action.ref, action.kind));
    case "setAppPrivacy":
      return withDraftIfChanged(state, setAppPrivacy(state.draft, action.slug, action.privacy));
    case "setLabSource":
      return edit(setLabSource(state.draft, action.id, action.source));
    case "addEntry":
      return edit(addEntry(state.draft, action.collection, action.seed).draft);
    case "removeEntry":
      return edit(removeEntry(state.draft, action.collection, action.id));
    case "moveEntry":
      return edit(moveEntry(state.draft, action.collection, action.id, action.direction));
    case "addCopyItem":
      return edit(addCopyItem(state.draft, action.ref, action.template));
    case "removeCopyItem":
      return edit(removeCopyItem(state.draft, action.ref, action.index));
    case "moveCopyItem":
      return edit(moveCopyItem(state.draft, action.ref, action.index, action.direction));
    case "attachMedia":
      return attach(state, action);
    case "resetField":
    {
      const draft = resetField(state, action.path);

      return draft === state.draft ? state : withDraft(state, draft);
    }
    case "discardAll":
      return withDraft(state, state.base);
    case "selectSection":
      return { ...state, section: action.id };
    case "search":
      return { ...state, query: action.query };
    case "restore":
      return withDraft(state, action.draft);
    case "published":
    {
      // The commit made every pending upload a repository file: the picker can offer it
      // and the next publish must not send it again. Its preview stays, because the live
      // site only serves the file after the next deploy.
      const uploaded = action.draft.media.map((entry) => entry.publicPath);
      const draft: ContentDraft = { ...action.draft, media: [] };
      const publicFiles = [...state.publicFiles, ...uploaded.filter((file) => !state.publicFiles.includes(file))];
      const previews = Object.fromEntries(Object.entries(state.previews).filter(([path]) => uploaded.includes(path)));

      return { ...state, base: draft, draft, baseSha: action.baseSha, publicFiles, previews };
    }
  }
}

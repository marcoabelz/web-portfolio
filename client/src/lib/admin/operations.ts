import type { Locale } from "@/i18n/locale";
import type { MessageDomain } from "@/i18n/messages";

import type { MessageNode, NodePath } from "@/lib/content/catalog";
import { COLLECTIONS, type CollectionDef, type CollectionId } from "@/lib/content/collections";
import type { ContentFileName } from "@/lib/content/schema";

import { blankCopy, MESSAGE_LOCALES, type ContentDraft } from "./draft";
import { resolveFactPath, type CopyRef, type FactRef } from "./schema";

// Pure edits of a draft. Every function returns a new draft, shares what it did not
// touch, and returns the draft it was given when the edit has nowhere to land, so a
// stale reference never invents a key the repository's files do not have.

type Container = Record<string | number, unknown>;

function isContainer(value: unknown): value is Container {
  return typeof value === "object" && value !== null;
}

function getAt(node: unknown, path: NodePath): unknown {
  let current = node;

  for (const part of path) {
    if (!isContainer(current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

// Replaces what sits at `path`, copying only the objects on the way. The caller has
// already checked the parents exist.
function setIn(node: unknown, path: NodePath, value: unknown): unknown {
  if (path.length === 0) {
    return value;
  }

  const [head, ...rest] = path;

  if (Array.isArray(node)) {
    return node.map((entry, index) => (index === head ? setIn(entry, rest, value) : entry));
  }

  const next = { ...(node as Container) };

  if (rest.length === 0 && value === undefined) {
    delete next[head];
  } else {
    next[head] = setIn((node as Container)[head], rest, value);
  }

  return next;
}

// A write may create the last key of an object (an optional field), but never a missing
// parent and never an array slot that is out of range.
function canWrite(root: unknown, path: NodePath): boolean {
  if (path.length === 0) {
    return false;
  }

  const parent = getAt(root, path.slice(0, -1));
  const last = path[path.length - 1];

  if (Array.isArray(parent)) {
    return typeof last === "number" && last >= 0 && last < parent.length;
  }

  return isContainer(parent) && typeof last === "string";
}

function withContent(draft: ContentDraft, file: ContentFileName, root: unknown): ContentDraft {
  return { ...draft, content: { ...draft.content, [file]: root } as ContentDraft["content"] };
}

function withMessages(draft: ContentDraft, locale: Locale, domain: MessageDomain, root: unknown): ContentDraft {
  return {
    ...draft,
    messages: {
      ...draft.messages,
      [locale]: { ...draft.messages[locale], [domain]: root as MessageNode },
    },
  };
}

// ------------------------------------------------------------------ copy and facts

export function setCopy(draft: ContentDraft, locale: Locale, ref: CopyRef, value: string): ContentDraft {
  const root = draft.messages[locale][ref.domain];

  // Only an existing text can be edited: the catalogues' keys are pinned to the repository.
  if (typeof getAt(root, ref.path) !== "string") {
    return draft;
  }

  return withMessages(draft, locale, ref.domain, setIn(root, ref.path, value));
}

// `undefined` removes an optional key (a live URL that was emptied).
export function setFact(draft: ContentDraft, ref: FactRef, value: unknown): ContentDraft {
  const root = draft.content[ref.file];
  const path = resolveFactPath(root, ref.path);

  if (!path || !canWrite(root, path)) {
    return draft;
  }

  return withContent(draft, ref.file, setIn(root, path, value));
}

// Switching the kind swaps the whole object so no key of the other kind survives. The
// image placeholder fails validation until an image is uploaded, which is what stops a
// cover with no picture from being published.
export function setCoverKind(draft: ContentDraft, ref: FactRef, kind: "pattern" | "image"): ContentDraft {
  const root = draft.content[ref.file];
  const path = resolveFactPath(root, ref.path);
  const current = path ? getAt(root, path) : undefined;

  if (!path || !isContainer(current) || Array.isArray(current) || current.kind === kind) {
    return draft;
  }

  const next =
    kind === "pattern"
      ? { kind: "pattern", variant: "signal" }
      : { kind: "image", src: "", width: 0, height: 0 };

  return withContent(draft, ref.file, setIn(root, path, next));
}

// ------------------------------------------------------------------ ids

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) {
    return base;
  }

  let n = 2;

  while (taken.has(`${base}-${n}`)) {
    n += 1;
  }

  return `${base}-${n}`;
}

// ------------------------------------------------------------------ collection entries

function definition(collection: CollectionId): CollectionDef {
  const def = COLLECTIONS.find((candidate) => candidate.id === collection);

  if (!def) {
    throw new Error(`Unknown collection ${collection}`);
  }

  return def;
}

function factList(draft: ContentDraft, def: CollectionDef): Record<string, unknown>[] | undefined {
  const list = getAt(draft.content[def.facts.file], def.facts.path);

  return Array.isArray(list) ? (list as Record<string, unknown>[]) : undefined;
}

function copyContainer(draft: ContentDraft, def: CollectionDef, locale: Locale): Container | undefined {
  if (!def.copy) {
    return undefined;
  }

  const node = getAt(draft.messages[locale][def.copy.domain], def.copy.path);

  return isContainer(node) && !Array.isArray(node) ? node : undefined;
}

export function addEntry(
  draft: ContentDraft,
  collection: CollectionId,
  seed: { name: string },
): { draft: ContentDraft; id: string } {
  const def = definition(collection);
  const list = factList(draft, def);
  const taken = new Set<string>(list?.map((entry) => String(entry[def.idKey])));

  for (const locale of MESSAGE_LOCALES) {
    Object.keys(copyContainer(draft, def, locale) ?? {}).forEach((key) => taken.add(key));
  }

  const id = uniqueId(slugify(seed.name) || "entry", taken);

  if (!list) {
    return { draft, id };
  }

  const fact = def.blank(id, seed);
  let next = withContent(draft, def.facts.file, setIn(draft.content[def.facts.file], def.facts.path, [...list, fact]));

  if (def.copy && (!def.copy.when || def.copy.when(fact))) {
    const { domain, path, item } = def.copy;

    for (const locale of MESSAGE_LOCALES) {
      const container = copyContainer(next, def, locale);

      if (container) {
        next = withMessages(next, locale, domain, setIn(next.messages[locale][domain], path, { ...container, [id]: structuredClone(item) }));
      }
    }
  }

  return { draft: next, id };
}

export function removeEntry(draft: ContentDraft, collection: CollectionId, id: string): ContentDraft {
  const def = definition(collection);
  const list = factList(draft, def);

  if (!list || !list.some((entry) => entry[def.idKey] === id)) {
    return draft;
  }

  let next = withContent(
    draft,
    def.facts.file,
    setIn(draft.content[def.facts.file], def.facts.path, list.filter((entry) => entry[def.idKey] !== id)),
  );

  if (def.copy) {
    const { domain, path } = def.copy;

    for (const locale of MESSAGE_LOCALES) {
      const container = copyContainer(next, def, locale);

      if (container && Object.hasOwn(container, id)) {
        const { [id]: _removed, ...rest } = container;
        next = withMessages(next, locale, domain, setIn(next.messages[locale][domain], path, rest));
      }
    }
  }

  return next;
}

function moved<T>(items: readonly T[], index: number, direction: -1 | 1): T[] | undefined {
  const target = index + direction;

  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return undefined;
  }

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];

  return next;
}

export function moveEntry(
  draft: ContentDraft,
  collection: CollectionId,
  id: string,
  direction: -1 | 1,
): ContentDraft {
  const def = definition(collection);
  const list = factList(draft, def);
  const next = list && moved(list, list.findIndex((entry) => entry[def.idKey] === id), direction);

  return next ? withContent(draft, def.facts.file, setIn(draft.content[def.facts.file], def.facts.path, next)) : draft;
}

// Removes or replaces one collection entry's copy in both catalogues. `undefined` removes it.
function setEntryCopy(draft: ContentDraft, def: CollectionDef, id: string, item: MessageNode | undefined): ContentDraft {
  if (!def.copy) {
    return draft;
  }

  let next = draft;

  for (const locale of MESSAGE_LOCALES) {
    const container = copyContainer(next, def, locale);

    if (!container) {
      continue;
    }

    const { [id]: _old, ...rest } = container;
    const value = item === undefined ? rest : { ...container, [id]: structuredClone(item) };
    next = withMessages(next, locale, def.copy.domain, setIn(next.messages[locale][def.copy.domain], def.copy.path, value));
  }

  return next;
}

function replaceEntry(draft: ContentDraft, def: CollectionDef, id: string, change: (entry: Record<string, unknown>) => Record<string, unknown>): ContentDraft {
  const list = factList(draft, def) ?? [];

  return withContent(
    draft,
    def.facts.file,
    setIn(draft.content[def.facts.file], def.facts.path, list.map((entry) => (entry[def.idKey] === id ? change(entry) : entry))),
  );
}

// A private app may show no live URL, so going private drops it. Screenshots and their
// captions stay (a private app may show dummy-data screenshots). Going public changes
// nothing else: the live URL reappears empty for the editor to fill.
export function setAppPrivacy(draft: ContentDraft, slug: string, privacy: "public" | "private"): ContentDraft {
  const def = definition("selectedApps");
  const app = factList(draft, def)?.find((entry) => entry.slug === slug);

  if (!app || app.privacy === privacy) {
    return draft;
  }

  if (privacy === "public") {
    return replaceEntry(draft, def, slug, (entry) => ({ ...entry, privacy }));
  }

  return replaceEntry(draft, def, slug, ({ liveUrl: _url, ...entry }) => ({ ...entry, privacy }));
}

// An archive lab entry borrows everything from the archive project it points at; a repo
// entry carries its own name, URL, stack, and description. Switching swaps the whole shape.
export function setLabSource(draft: ContentDraft, id: string, source: "repo" | "archive"): ContentDraft {
  const def = definition("lab");
  const list = factList(draft, def);
  const current = list?.find((entry) => entry.id === id);

  if (!list || !current || current.source === source) {
    return draft;
  }

  if (source === "repo") {
    const next = replaceEntry(draft, def, id, () => ({ id, source: "repo", name: "", url: "", stack: [] }));

    return setEntryCopy(next, def, id, def.copy?.item);
  }

  // The first archive project with a public repository that no other entry shows yet;
  // "" when there is none, which checkDraft reports on this entry.
  const used = new Set(list.flatMap((entry) => (entry.source === "archive" ? [entry.archiveId] : [])));
  const candidates = draft.content.projects.archive.filter((project) => project.repositoryUrl);
  const archiveId = (candidates.find((project) => !used.has(project.id)) ?? candidates[0])?.id ?? "";
  const next = replaceEntry(draft, def, id, () => ({ id, source: "archive", archiveId }));

  return setEntryCopy(next, def, id, undefined);
}

// ------------------------------------------------------------------ copy lists (both locales)

function mapLists(
  draft: ContentDraft,
  ref: CopyRef,
  change: (list: MessageNode[]) => MessageNode[] | undefined,
): ContentDraft {
  const results = MESSAGE_LOCALES.map((locale) => {
    const list = getAt(draft.messages[locale][ref.domain], ref.path);

    return Array.isArray(list) ? change(list as MessageNode[]) : undefined;
  });

  // Both locales or neither: a list that only one catalogue could change would break parity.
  if (results.some((result) => result === undefined)) {
    return draft;
  }

  return MESSAGE_LOCALES.reduce(
    (current, locale, index) =>
      withMessages(current, locale, ref.domain, setIn(current.messages[locale][ref.domain], ref.path, results[index])),
    draft,
  );
}

export function addCopyItem(draft: ContentDraft, ref: CopyRef, template: MessageNode): ContentDraft {
  return mapLists(draft, ref, (list) => [...list, blankCopy(template)]);
}

export function removeCopyItem(draft: ContentDraft, ref: CopyRef, index: number): ContentDraft {
  return mapLists(draft, ref, (list) =>
    Number.isInteger(index) && index >= 0 && index < list.length ? list.filter((_, at) => at !== index) : undefined,
  );
}

export function moveCopyItem(draft: ContentDraft, ref: CopyRef, index: number, direction: -1 | 1): ContentDraft {
  return mapLists(draft, ref, (list) => moved(list, index, direction));
}

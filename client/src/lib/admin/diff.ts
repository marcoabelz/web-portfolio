import type { Locale } from "@/i18n/locale";
import type { MessageDomain } from "@/i18n/messages";

import type { NodePath } from "@/lib/content/catalog";
import { COLLECTIONS, type CollectionDef } from "@/lib/content/collections";
import type { ContentFileName } from "@/lib/content/schema";

import { MESSAGE_LOCALES, referencedMedia, type ContentDraft } from "./draft";
import {
  EDITOR_SECTIONS,
  pathText,
  resolveFactPath,
  uncoveredCopyPaths,
  uncoveredFactPaths,
  type FactSegment,
  type FieldDef,
  type SectionDef,
} from "./schema";

export type Change = {
  label: string;
  kind: "edited" | "added" | "removed" | "moved";
  locale?: Locale;
  before?: string;
  after?: string;
};

export type ChangeGroup = { sectionId: string; title: string; changes: Change[] };

const OTHER = { sectionId: "other", title: "Other" } as const;

// ------------------------------------------------------------------ reading a draft

function getAt(node: unknown, path: readonly (string | number)[]): unknown {
  let current = node;

  for (const part of path) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    current = (current as Record<string | number, unknown>)[part];
  }

  return current;
}

function scalar(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === null) {
    return "None";
  }

  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

// A field's value as the review shows it: one line, whatever the field kind.
function show(field: FieldDef, value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  switch (field.kind) {
    case "month":
      return value === null ? "Present" : scalar(value);
    case "toggle":
      return value === true ? "On" : "Off";
    case "tags":
      return Array.isArray(value) ? value.map(String).join(", ") : scalar(value);
    case "image":
      return describeImages(value).join(", ");
    case "icon":
      return Array.isArray(value)
        ? value
            .map((icon: { name?: string; icon?: string | null; monogram?: string }) =>
              `${icon.name ?? ""}${icon.icon ? ` (${icon.icon})` : ""}${icon.monogram ? ` "${icon.monogram}"` : ""}`,
            )
            .join(", ")
        : scalar(value);
    default:
      return scalar(value);
  }
}

function imageSources(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];

  return items.flatMap((item) => {
    const src = getAt(item, ["src"]);

    return typeof src === "string" && src !== "" ? [src] : [];
  });
}

// A picture's file and its size, so a re-export at another size reads as a change even
// when the path stays the same.
function describeImages(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];

  return items.flatMap((item) => {
    const src = getAt(item, ["src"]);

    if (typeof src !== "string" || src === "") {
      return [];
    }

    const width = getAt(item, ["width"]);
    const height = getAt(item, ["height"]);

    return [typeof width === "number" && typeof height === "number" ? `${src} (${width}x${height})` : src];
  });
}

// A homepage section by the heading readers see, falling back to its id.
function homeTitle(draft: ContentDraft, id: string): string {
  const title = getAt(draft.messages.en.common, ["sections", id, "title"]);

  return typeof title === "string" && title.trim() !== "" ? title : id;
}

function relativeLeaves(node: unknown, prefix: NodePath = []): NodePath[] {
  if (typeof node === "string") {
    return [prefix];
  }

  if (Array.isArray(node)) {
    return node.flatMap((entry, index) => relativeLeaves(entry, [...prefix, index]));
  }

  if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, value]) => relativeLeaves(value, [...prefix, key]));
  }

  return [];
}

// ------------------------------------------------------------------ field instances
//
// Every field is expanded into instances: one per entry of a collection, one per item of
// a list. An instance is keyed by what it edits, with collection entries identified by
// their id rather than their position, so the same field in the old and the new draft
// lines up even after a reorder.

type Instance = {
  key: string;
  sectionId: string;
  label: string;
  values: Partial<Record<Locale | "all", string | undefined>>;
  sources: string[];
  entry?: string;
};

type OrderedList = { key: string; sectionId: string; ids: string[]; labelFor: (id: string) => string };

type Entry = { sectionId: string; label: string };

type Collected = {
  instances: Instance[];
  lists: OrderedList[];
  entries: Map<string, Entry>;
};

type Ctx = {
  sectionId: string;
  prefix: string;
  copyBase: NodePath;
  factBase?: NodePath; // resolved against this draft; undefined inside a copy list item
  factKeyBase: string; // the same position written with ids, stable across reorders
  factFile?: ContentFileName;
  inItem: boolean;
  entry?: string;
};

function labelled(ctx: Ctx, label: string): string {
  return ctx.prefix ? `${ctx.prefix}: ${label}` : label;
}

function definition(id: string): CollectionDef | undefined {
  return COLLECTIONS.find((candidate) => candidate.id === id);
}

function collect(draft: ContentDraft, sections: readonly SectionDef[]): Collected {
  const out: Collected = { instances: [], lists: [], entries: new Map() };
  const seen = new Set<string>();

  const add = (instance: Instance) => {
    if (!seen.has(instance.key)) {
      seen.add(instance.key);
      out.instances.push(instance);
    }
  };

  const copyValues = (domain: MessageDomain, path: NodePath): Instance["values"] =>
    Object.fromEntries(
      MESSAGE_LOCALES.map((locale) => [locale, scalar(getAt(draft.messages[locale][domain], path))]),
    );

  const walk = (fields: readonly FieldDef[], ctx: Ctx) => {
    const base = { sectionId: ctx.sectionId, entry: ctx.entry };

    const copyInstance = (domain: MessageDomain, rel: NodePath, label: string) => {
      const path = [...ctx.copyBase, ...rel];

      add({ ...base, key: `c:${domain}.${pathText(path)}`, label, values: copyValues(domain, path), sources: [] });
    };

    const factInstance = (
      field: FieldDef,
      file: ContentFileName,
      rel: readonly FactSegment[],
      label: string,
      format: (value: unknown) => string | undefined = (value) => show(field, value),
      sourcesOf: (value: unknown) => string[] = () => [],
    ) => {
      if (!ctx.factBase || (ctx.factFile && ctx.factFile !== file)) {
        return;
      }

      const root = draft.content[file];
      const path = resolveFactPath(root, [...ctx.factBase, ...rel]);
      const value = path ? getAt(root, path) : undefined;

      add({
        ...base,
        key: `f:${file}|${ctx.factKeyBase}|${pathText(rel)}`,
        label,
        values: { all: format(value) },
        sources: sourcesOf(value),
      });
    };

    for (const field of fields) {
      switch (field.kind) {
        case "text":
        case "paragraph": {
          const label = ctx.inItem && field.copy.path.length === 0 ? ctx.prefix : labelled(ctx, field.label);
          copyInstance(field.copy.domain, field.copy.path, label);
          break;
        }
        case "textList": {
          const root = [...ctx.copyBase, ...field.copy.path];
          const rels = new Map<string, NodePath>();

          for (const locale of MESSAGE_LOCALES) {
            for (const rel of relativeLeaves(getAt(draft.messages[locale][field.copy.domain], root))) {
              rels.set(pathText(rel), rel);
            }
          }

          for (const rel of Array.from(rels.values())) {
            const suffix = typeof rel[0] === "number" && rel.length === 1 ? ` ${rel[0] + 1}` : ` ${pathText(rel)}`;

            copyInstance(field.copy.domain, [...field.copy.path, ...rel], labelled(ctx, `${field.label}${suffix}`));
          }
          break;
        }
        case "copyList": {
          const listPath = [...ctx.copyBase, ...field.copy.path];
          const count = Math.max(
            0,
            ...MESSAGE_LOCALES.map((locale) => {
              const list = getAt(draft.messages[locale][field.copy.domain], listPath);

              return Array.isArray(list) ? list.length : 0;
            }),
          );

          for (let index = 0; index < count; index += 1) {
            walk(field.item, {
              ...ctx,
              prefix: labelled(ctx, `${field.label} ${index + 1}`),
              copyBase: [...listPath, index],
              factBase: undefined,
              inItem: true,
            });
          }
          break;
        }
        case "image": {
          factInstance(field, field.fact.file, field.fact.path, labelled(ctx, field.label), undefined, imageSources);

          if (field.alt) {
            copyInstance(field.alt.domain, field.alt.path, labelled(ctx, `${field.label} description`));
          }
          break;
        }
        case "resume":
          factInstance(field, "site", ["profile", "resumePath"], field.label, undefined, (value) =>
            typeof value === "string" ? [value] : [],
          );
          break;
        case "sections": {
          const list = draft.content.site.sections;

          out.lists.push({
            key: "site.sections",
            sectionId: ctx.sectionId,
            ids: list.map((entry) => entry.id),
            labelFor: (id) => `${field.label}: ${homeTitle(draft, id)}`,
          });

          list.forEach((entry) =>
            add({
              ...base,
              key: `f:site|sections[id=${entry.id}]|visible`,
              label: `${field.label}: ${homeTitle(draft, entry.id)}`,
              values: { all: entry.visible ? "Shown" : "Hidden" },
              sources: [],
            }),
          );
          break;
        }
        case "collection": {
          const def = definition(field.collection);
          const entries = def ? getAt(draft.content[def.facts.file], def.facts.path) : undefined;

          if (!def || !Array.isArray(entries)) {
            break;
          }

          const titles = new Map<string, string>();

          entries.forEach((entry: Record<string, unknown>, index: number) => {
            const id = String(entry[def.idKey]);
            const titled = getAt(entry, field.titleFrom.path as NodePath);
            const title = typeof titled === "string" && titled.trim() !== "" ? titled : id;
            const key = `${def.id}:${id}`;

            titles.set(id, title);
            out.entries.set(key, { sectionId: ctx.sectionId, label: `${field.label}: ${title}` });

            walk(field.fields, {
              sectionId: ctx.sectionId,
              prefix: title,
              copyBase: def.copy ? [...def.copy.path, id] : [],
              factBase: [...def.facts.path, index],
              factKeyBase: `${pathText(def.facts.path)}[${def.idKey}=${id}]`,
              factFile: def.facts.file,
              inItem: false,
              entry: key,
            });
          });

          out.lists.push({
            key: `collection:${def.id}`,
            sectionId: ctx.sectionId,
            ids: entries.map((entry: Record<string, unknown>) => String(entry[def.idKey])),
            labelFor: (id) => `${field.label}: ${titles.get(id) ?? id}`,
          });
          break;
        }
        case "fact":
        case "month":
        case "select":
        case "toggle":
        case "tags":
        case "icon":
          factInstance(field, field.fact.file, field.fact.path, labelled(ctx, field.label));
          break;
      }
    }
  };

  for (const section of sections) {
    walk(section.fields, {
      sectionId: section.id,
      prefix: "",
      copyBase: [],
      factBase: [],
      factKeyBase: "",
      inItem: false,
    });
  }

  return out;
}

// ------------------------------------------------------------------ order

// Ids whose place changed. The longest run that kept its relative order stays put, so
// moving one entry is one change rather than one for everything it jumped over.
function movedIds(before: readonly string[], after: readonly string[]): string[] {
  const common = new Set(before.filter((id) => after.includes(id)));
  const baseOrder = before.filter((id) => common.has(id));
  const order = after.filter((id) => common.has(id)).map((id) => baseOrder.indexOf(id));
  const best: number[] = [];
  const previous: number[] = [];

  order.forEach((value, index) => {
    best[index] = 1;
    previous[index] = -1;

    for (let at = 0; at < index; at += 1) {
      if (order[at] < value && best[at] + 1 > best[index]) {
        best[index] = best[at] + 1;
        previous[index] = at;
      }
    }
  });

  let tail = best.length === 0 ? -1 : best.indexOf(Math.max(...best));
  const stays = new Set<number>();

  while (tail >= 0) {
    stays.add(tail);
    tail = previous[tail];
  }

  return after.filter((id) => common.has(id)).filter((_, index) => !stays.has(index));
}

// ------------------------------------------------------------------ unmapped leaves

type Leaves = Map<string, string>;

function factLeafValues(node: unknown, prefix: string, into: Leaves): void {
  if (Array.isArray(node)) {
    node.forEach((entry, index) => factLeafValues(entry, `${prefix}[${index}]`, into));
  } else if (typeof node === "object" && node !== null) {
    Object.entries(node).forEach(([key, value]) => factLeafValues(value, prefix ? `${prefix}.${key}` : key, into));
  } else {
    into.set(prefix, scalar(node) ?? "");
  }
}

function leafValues(draft: ContentDraft): { facts: Leaves; copy: Record<Locale, Leaves> } {
  const facts: Leaves = new Map();
  const copy = { en: new Map(), id: new Map() } as Record<Locale, Leaves>;

  (Object.keys(draft.content) as ContentFileName[]).forEach((file) => factLeafValues(draft.content[file], file, facts));

  for (const locale of MESSAGE_LOCALES) {
    for (const domain of Object.keys(draft.messages[locale]) as MessageDomain[]) {
      for (const path of relativeLeaves(draft.messages[locale][domain])) {
        const value = getAt(draft.messages[locale][domain], path);

        copy[locale].set(`${domain}.${pathText(path)}`, typeof value === "string" ? value : "");
      }
    }
  }

  return { facts, copy };
}

function kindOf(before: string | undefined, after: string | undefined): Change["kind"] {
  return before === undefined ? "added" : after === undefined ? "removed" : "edited";
}

// ------------------------------------------------------------------ the diff

export function diffDraft(
  base: ContentDraft,
  draft: ContentDraft,
  sections: readonly SectionDef[] = EDITOR_SECTIONS,
): ChangeGroup[] {
  const before = collect(base, sections);
  const after = collect(draft, sections);
  const byInstance = new Map(before.instances.map((instance) => [instance.key, instance]));
  const found = new Map<string, Change[]>();
  const push = (sectionId: string, change: Change) => found.set(sectionId, [...(found.get(sectionId) ?? []), change]);

  // Entries that appeared or vanished are reported once; their leaves are not.
  const hidden = new Set<string>();

  for (const [key, entry] of Array.from(after.entries)) {
    if (!before.entries.has(key)) {
      hidden.add(key);
      push(entry.sectionId, { label: entry.label, kind: "added" });
    }
  }

  for (const [key, entry] of Array.from(before.entries)) {
    if (!after.entries.has(key)) {
      hidden.add(key);
      push(entry.sectionId, { label: entry.label, kind: "removed" });
    }
  }

  for (const list of after.lists) {
    const old = before.lists.find((candidate) => candidate.key === list.key);

    for (const id of old ? movedIds(old.ids, list.ids) : []) {
      push(list.sectionId, { label: list.labelFor(id), kind: "moved" });
    }
  }

  const compare = (instance: Instance, old: Instance | undefined, current: Instance | undefined) => {
    if (instance.entry && hidden.has(instance.entry)) {
      return;
    }

    const locales = Array.from(
      new Set([...Object.keys(old?.values ?? {}), ...Object.keys(current?.values ?? {})]),
    ) as (Locale | "all")[];

    for (const key of locales) {
      const was = old?.values[key];
      const now = current?.values[key];

      if (was !== now) {
        push(instance.sectionId, {
          label: instance.label,
          kind: kindOf(was, now),
          ...(key === "all" ? {} : { locale: key }),
          ...(was === undefined ? {} : { before: was }),
          ...(now === undefined ? {} : { after: now }),
        });
      }
    }
  };

  const present = new Set(after.instances.map((instance) => instance.key));

  for (const instance of after.instances) {
    compare(instance, byInstance.get(instance.key), instance);
  }

  for (const instance of before.instances) {
    if (!present.has(instance.key)) {
      compare(instance, instance, undefined);
    }
  }

  // Uploads that are still in the draft and still referenced, under the field that uses them.
  const used = new Set(referencedMedia(draft.content));
  const uploaded = new Set(base.media.map((item) => item.repoPath));

  for (const item of draft.media) {
    if (uploaded.has(item.repoPath) || !used.has(item.publicPath)) {
      continue;
    }

    const owner = after.instances.find((instance) => instance.sources.includes(item.publicPath));

    push(owner?.sectionId ?? OTHER.sectionId, {
      label: owner ? `${owner.label} (new file)` : "Uploaded file",
      kind: "added",
      after: item.publicPath,
    });
  }

  // Everything no field reaches.
  const was = leafValues(base);
  const now = leafValues(draft);
  const factPaths = new Set([...uncoveredFactPaths(sections, base), ...uncoveredFactPaths(sections, draft)]);
  const copyPaths = new Set([...uncoveredCopyPaths(sections, base), ...uncoveredCopyPaths(sections, draft)]);

  for (const path of Array.from(factPaths)) {
    if (was.facts.get(path) !== now.facts.get(path)) {
      push(OTHER.sectionId, {
        label: path,
        kind: kindOf(was.facts.get(path), now.facts.get(path)),
        ...(was.facts.has(path) ? { before: was.facts.get(path) } : {}),
        ...(now.facts.has(path) ? { after: now.facts.get(path) } : {}),
      });
    }
  }

  for (const path of Array.from(copyPaths)) {
    for (const locale of MESSAGE_LOCALES) {
      if (was.copy[locale].get(path) !== now.copy[locale].get(path)) {
        push(OTHER.sectionId, {
          label: path,
          kind: kindOf(was.copy[locale].get(path), now.copy[locale].get(path)),
          locale,
          ...(was.copy[locale].has(path) ? { before: was.copy[locale].get(path) } : {}),
          ...(now.copy[locale].has(path) ? { after: now.copy[locale].get(path) } : {}),
        });
      }
    }
  }

  const groups = sections.flatMap((section) =>
    found.has(section.id) ? [{ sectionId: section.id, title: section.title, changes: found.get(section.id) ?? [] }] : [],
  );
  const unmapped = found.get(OTHER.sectionId);

  return unmapped ? [...groups, { ...OTHER, changes: unmapped }] : groups;
}

export function countChanges(groups: readonly ChangeGroup[]): number {
  return groups.reduce((total, group) => total + group.changes.length, 0);
}

// One line for the git log: which parts of the site changed, not every field.
export function commitMessage(groups: readonly ChangeGroup[]): string {
  if (groups.length === 0) {
    return "content: update";
  }

  const titles = groups.map((group) => group.title.toLowerCase());
  const shown = titles.slice(0, 3).join(", ");

  return `content: update ${shown}${titles.length > 3 ? ` and ${titles.length - 3} more` : ""}`;
}

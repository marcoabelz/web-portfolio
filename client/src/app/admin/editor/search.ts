import { COLLECTIONS } from "@/lib/content/collections";
import { MESSAGE_LOCALES, type ContentDraft } from "@/lib/admin/draft";
import { resolveFactPath, type FactSegment, type FieldDef, type SectionDef } from "@/lib/admin/schema";

// Which fields match a search, across sections. A field matches on its label or on its
// current text in either language; collection entries and list items count too, with the
// entry's title in the label so "Fastify" points at the app that uses it.

export type SearchHit = { sectionId: string; fieldLabels: string[] };

type Path = readonly (string | number)[];

type Scope = {
  prefix: string;
  copyBase: Path;
  // Resolved index path of the entry the facts belong to; undefined inside a copy list item.
  factBase: Path | undefined;
  factFile?: string;
};

function at(node: unknown, path: Path): unknown {
  let current = node;

  for (const part of path) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    current = (current as Record<string | number, unknown>)[part];
  }

  return current;
}

// Every string inside a value, however it is nested.
function strings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(strings);
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(strings);
  }

  return [];
}

export function filterFields(
  sections: readonly SectionDef[],
  draft: ContentDraft,
  query: string,
): SearchHit[] {
  const needle = query.trim().toLowerCase();

  if (needle === "") {
    return [];
  }

  const hits: SearchHit[] = [];

  for (const section of sections) {
    const labels: string[] = [];

    const visit = (label: string, texts: string[]) => {
      if (
        label.toLowerCase().includes(needle) ||
        texts.some((text) => text.toLowerCase().includes(needle))
      ) {
        labels.push(label);
      }
    };

    const copyTexts = (domain: "common" | "portfolio" | "projects", scope: Scope, rel: Path) =>
      MESSAGE_LOCALES.flatMap((locale) =>
        strings(at(draft.messages[locale][domain], [...scope.copyBase, ...rel])),
      );

    const factTexts = (scope: Scope, file: string, rel: readonly FactSegment[]) => {
      if (scope.factFile && scope.factFile !== file) {
        return [];
      }

      const root = draft.content[file as keyof ContentDraft["content"]];
      const path = scope.factBase
        ? resolveFactPath(root, [...scope.factBase, ...rel])
        : resolveFactPath(root, rel);

      return path ? strings(at(root, path)) : [];
    };

    const walk = (fields: readonly FieldDef[], scope: Scope) => {
      for (const field of fields) {
        const label = scope.prefix ? `${scope.prefix}: ${field.label}` : field.label;

        switch (field.kind) {
          case "text":
          case "paragraph":
          case "textList":
            visit(label, copyTexts(field.copy.domain, scope, field.copy.path));
            break;
          case "fact":
          case "month":
          case "select":
          case "toggle":
          case "tags":
          case "icon":
            visit(label, factTexts(scope, field.fact.file, field.fact.path));
            break;
          case "image":
            visit(label, [
              ...factTexts(scope, field.fact.file, field.fact.path),
              ...(field.alt ? copyTexts(field.alt.domain, scope, field.alt.path) : []),
            ]);
            break;
          case "resume":
            visit(label, factTexts({ ...scope, factBase: undefined }, "site", ["profile", "resumePath"]));
            break;
          case "sections":
            visit(label, strings(draft.content.site.sections.map((entry) => entry.id)));
            break;
          case "copyList": {
            visit(label, []);

            const list = at(draft.messages.en[field.copy.domain], [...scope.copyBase, ...field.copy.path]);
            const count = Array.isArray(list) ? list.length : 0;

            for (let index = 0; index < count; index += 1) {
              walk(field.item, {
                prefix: `${label} ${index + 1}`,
                copyBase: [...scope.copyBase, ...field.copy.path, index],
                factBase: undefined,
              });
            }
            break;
          }
          case "collection": {
            visit(label, []);

            const def = COLLECTIONS.find((candidate) => candidate.id === field.collection);
            const entries = def ? at(draft.content[def.facts.file], def.facts.path) : undefined;

            if (!def || !Array.isArray(entries)) {
              break;
            }

            entries.forEach((entry: Record<string, unknown>, index: number) => {
              const id = String(entry[def.idKey]);
              const titled = at(entry, field.titleFrom.path as Path);
              const title = typeof titled === "string" && titled.trim() !== "" ? titled : id;

              walk(field.fields, {
                prefix: title,
                copyBase: def.copy ? [...def.copy.path, id] : [],
                factBase: [...def.facts.path, index],
                factFile: def.facts.file,
              });
            });
            break;
          }
        }
      }
    };

    walk(section.fields, { prefix: "", copyBase: [], factBase: undefined });

    if (labels.length > 0) {
      hits.push({ sectionId: section.id, fieldLabels: Array.from(new Set(labels)) });
    }
  }

  return hits;
}

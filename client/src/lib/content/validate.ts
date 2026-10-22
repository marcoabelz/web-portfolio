import type { Locale } from "@/i18n/locale";

import type { MessageCatalogs, MessageNode } from "./catalog";
import { checkClientNames } from "./client-names";
import { COLLECTIONS } from "./collections";
import {
  portfolioFileSchema,
  projectsFileSchema,
  siteFileSchema,
  type ContentFileName,
  type ContentFiles,
} from "./schema";

export type ContentIssue = {
  file: ContentFileName | "messages" | "media";
  path: string;
  message: string;
};

export type ContentParse =
  | { ok: true; value: ContentFiles }
  | { ok: false; issues: ContentIssue[] };

const SCHEMAS = {
  site: siteFileSchema,
  portfolio: portfolioFileSchema,
  projects: projectsFileSchema,
} as const;

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((out, part) => {
    if (typeof part === "number") {
      return `${out}[${part}]`;
    }

    return out ? `${out}.${String(part)}` : String(part);
  }, "");
}

export function parseContentFiles(raw: Record<ContentFileName, unknown>): ContentParse {
  const issues: ContentIssue[] = [];
  const value: Partial<ContentFiles> = {};

  for (const file of Object.keys(SCHEMAS) as ContentFileName[]) {
    const result = SCHEMAS[file].safeParse(raw[file]);

    if (result.success) {
      (value as Record<string, unknown>)[file] = result.data;
      continue;
    }

    for (const issue of result.error.issues) {
      const keys = issue.code === "unrecognized_keys" ? issue.keys : [undefined];

      for (const key of keys) {
        issues.push({
          file,
          path: formatPath(key === undefined ? issue.path : [...issue.path, key]),
          message: issue.message,
        });
      }
    }
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: value as ContentFiles };
}

const LOCALES: readonly Locale[] = ["en", "id"];

function factsOf(content: ContentFiles, file: ContentFileName, path: readonly string[]) {
  let node: unknown = content[file];

  for (const key of path) {
    node = (node as Record<string, unknown>)[key];
  }

  return Array.isArray(node) ? (node as Record<string, unknown>[]) : [];
}

function nodeAt(root: MessageNode, path: readonly string[]): MessageNode | undefined {
  let node: MessageNode | undefined = root;

  for (const key of path) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
      return undefined;
    }

    node = node[key];
  }

  return node;
}

function describeNode(node: unknown): string {
  if (Array.isArray(node)) {
    return "a list";
  }

  return node === null ? "nothing" : typeof node === "object" ? "a group of fields" : `a ${typeof node}`;
}

// Every entry of a collection has to look like the collection's blank template: the
// same keys, the same kinds of value, checked all the way down. Arrays may be any length
// (a template array of one string means "any number of strings"). Extra keys are left
// alone because some entries carry optional copy, such as screenshot captions.
function checkEntryShape(
  node: unknown,
  template: MessageNode,
  path: string,
  report: (path: string, message: string) => void,
): void {
  if (typeof template === "string") {
    if (typeof node !== "string") {
      report(path, `Expected text, found ${describeNode(node)}.`);
    }

    return;
  }

  if (Array.isArray(template)) {
    if (!Array.isArray(node)) {
      report(path, `Expected a list, found ${describeNode(node)}.`);
    } else if (template.length > 0) {
      node.forEach((member, index) => checkEntryShape(member, template[0], `${path}[${index}]`, report));
    }

    return;
  }

  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    report(path, `Expected a group of fields, found ${describeNode(node)}.`);

    return;
  }

  for (const [key, member] of Object.entries(template)) {
    if (!Object.hasOwn(node, key)) {
      report(`${path}.${key}`, "Missing field.");
    } else {
      checkEntryShape((node as Record<string, unknown>)[key], member, `${path}.${key}`, report);
    }
  }
}

export function checkContentReferences(
  content: ContentFiles,
  catalogs: MessageCatalogs,
): ContentIssue[] {
  const issues: ContentIssue[] = [];

  const add = (file: ContentIssue["file"], path: string, message: string) =>
    issues.push({ file, path, message });

  for (const collection of COLLECTIONS) {
    const { file, path } = collection.facts;
    const facts = factsOf(content, file, path);
    const seen = new Set<string>();

    facts.forEach((fact, index) => {
      const id = String(fact[collection.idKey]);

      if (seen.has(id)) {
        add(file, `${path.join(".")}[${index}].${collection.idKey}`, `Duplicate id "${id}".`);
      }

      seen.add(id);
    });

    const { copy } = collection;

    if (!copy) {
      continue;
    }

    const needed = new Set(
      facts.filter((fact) => copy.when?.(fact) ?? true).map((fact) => String(fact[collection.idKey])),
    );

    for (const locale of LOCALES) {
      const base = `${locale}.${copy.domain}.${copy.path.join(".")}`;
      const node = nodeAt(catalogs[locale][copy.domain], copy.path);
      const entries =
        typeof node === "object" && node !== null && !Array.isArray(node) ? node : ({} as Record<string, MessageNode>);

      for (const id of Array.from(needed)) {
        if (!Object.hasOwn(entries, id)) {
          add("messages", `${base}.${id}`, `Missing ${locale} copy for "${id}".`);
        } else {
          checkEntryShape(entries[id], copy.item, `${base}.${id}`, (path, message) =>
            add("messages", path, message),
          );
        }
      }

      for (const id of Object.keys(entries)) {
        if (!needed.has(id)) {
          add("messages", `${base}.${id}`, `Copy for "${id}" has no matching entry in the facts.`);
        }
      }
    }
  }

  const { site, portfolio, projects } = content;

  const sectionIds = new Set<string>();
  site.sections.forEach((section, index) => {
    if (sectionIds.has(section.id)) {
      add("site", `sections[${index}].id`, `Section "${section.id}" is listed twice.`);
    }

    sectionIds.add(section.id);
  });

  const linkIds = new Set<string>();
  site.socialLinks.forEach((link, index) => {
    if (linkIds.has(link.id)) {
      add("site", `socialLinks[${index}].id`, `Social link "${link.id}" is listed twice.`);
    }

    linkIds.add(link.id);
  });

  const iconNames = new Set<string>();
  portfolio.skillIcons.forEach((icon, index) => {
    if (iconNames.has(icon.name)) {
      add("portfolio", `skillIcons[${index}].name`, `Skill icon "${icon.name}" is listed twice.`);
    }

    iconNames.add(icon.name);
  });

  portfolio.experiences.forEach((experience, index) => {
    if (experience.endDate !== null && experience.endDate < experience.startDate) {
      add("portfolio", `experiences[${index}].endDate`, "End month is before the start month.");
    }
  });

  projects.selected.forEach((app, index) => {
    // A public app that shows screenshots but has nowhere to link them is an editing
    // slip. It is reported rather than quietly turned into a private card.
    if (app.privacy === "public" && app.screenshots.length > 0 && app.liveUrl === undefined) {
      add("projects", `selected[${index}].liveUrl`, "A public app with screenshots needs a live URL.");
    }

    // A private app may show screenshots (of dummy data only; the editor cannot check
    // that), but it never links to a live system.
    if (app.privacy !== "private") {
      return;
    }

    if (app.liveUrl !== undefined) {
      add("projects", `selected[${index}].liveUrl`, "A private app cannot have a live URL.");
    }
  });

  // Each screenshot needs a caption in both languages, or the gallery renders a
  // picture with no accessible name.
  projects.selected.forEach((app) => {
    for (const locale of LOCALES) {
      const entry = nodeAt(catalogs[locale].projects, ["selected", app.slug]);
      const captions = nodeAt(entry ?? "", ["screenshots"]);
      // Copy with no screenshots array counts as zero captions.
      const found = Array.isArray(captions) ? captions.length : 0;

      if (entry !== undefined && found !== app.screenshots.length) {
        add(
          "messages",
          `${locale}.projects.selected.${app.slug}.screenshots`,
          `Expected ${app.screenshots.length} captions, found ${found}.`,
        );
      }
    }
  });

  // The trust boundary for client names: the build and the editor's checkDraft both
  // run this, so a publish that names a client is refused instead of committed.
  issues.push(...checkClientNames(content, catalogs));

  const archive = new Map(projects.archive.map((project) => [project.id, project]));

  portfolio.lab.forEach((entry, index) => {
    if (entry.source !== "archive") {
      return;
    }

    const target = archive.get(entry.archiveId);

    if (!target) {
      add("portfolio", `lab[${index}].archiveId`, `No archive project with id "${entry.archiveId}".`);
    } else if (!target.repositoryUrl) {
      add(
        "portfolio",
        `lab[${index}].archiveId`,
        `Archive project "${entry.archiveId}" has no repository URL.`,
      );
    }
  });

  return issues;
}

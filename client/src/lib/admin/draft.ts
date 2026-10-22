import type { Locale } from "@/i18n/locale";
import type { MessageDomain } from "@/i18n/messages";
import { routing } from "@/i18n/routing";

import { checkCatalogParity, type MessageCatalogs, type MessageNode, type NodePath } from "@/lib/content/catalog";
import { checkClientNamesInPaths } from "@/lib/content/client-names";
import { COLLECTIONS } from "@/lib/content/collections";
import type { ContentFileName, ContentFiles } from "@/lib/content/schema";
import { checkContentReferences, parseContentFiles, type ContentIssue } from "@/lib/content/validate";

// The node helpers moved to lib/content/catalog.ts so the content validator can share
// them; re-exported so the editor's imports stay put.
export { leafPaths, placeholdersOf } from "@/lib/content/catalog";
export type { MessageNode, NodePath } from "@/lib/content/catalog";

export type MessageDraft = MessageCatalogs;

export const MESSAGE_DOMAINS = [
  "common",
  "portfolio",
  "projects",
] as const satisfies readonly MessageDomain[];

export const MESSAGE_LOCALES = routing.locales;

// A new array item copies the shape of the previous one with every string blanked,
// which is what keeps a freshly added entry structurally identical across locales.
export function blankCopy(node: MessageNode): MessageNode {
  if (typeof node === "string") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(blankCopy);
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, blankCopy(value)]),
  );
}

function replaceAt(
  node: MessageNode,
  path: NodePath,
  next: (current: MessageNode) => MessageNode,
): MessageNode {
  if (path.length === 0) {
    return next(node);
  }

  const [head, ...rest] = path;

  if (Array.isArray(node) && typeof head === "number") {
    return node.map((entry, index) => (index === head ? replaceAt(entry, rest, next) : entry));
  }

  if (typeof node === "object" && !Array.isArray(node) && typeof head === "string") {
    return { ...node, [head]: replaceAt(node[head], rest, next) };
  }

  return node;
}

export function updateLeaf(root: MessageNode, path: NodePath, value: string): MessageNode {
  return replaceAt(root, path, () => value);
}

export function appendItem(root: MessageNode, path: NodePath): MessageNode {
  return replaceAt(root, path, (node) => {
    // With no existing entry there is no shape to copy, so the array is left alone;
    // the UI hides the button rather than inventing a schema.
    if (!Array.isArray(node) || node.length === 0) {
      return node;
    }

    return [...node, blankCopy(node[node.length - 1])];
  });
}

export function removeItem(root: MessageNode, path: NodePath, index: number): MessageNode {
  return replaceAt(root, path, (node) => {
    if (!Array.isArray(node)) {
      return node;
    }

    return node.filter((_, position) => position !== index);
  });
}

// An image or the CV that was uploaded in this editing session and is not in the
// repository yet. `sha` is the blob GitHub already holds for it.
export type PendingMedia = {
  kind: "image" | "resume";
  repoPath: string;
  publicPath: string;
  sha: string;
};

export type ContentDraft = {
  content: ContentFiles;
  messages: MessageCatalogs;
  media: PendingMedia[];
};

export const CONTENT_FILES = [
  "site",
  "portfolio",
  "projects",
] as const satisfies readonly ContentFileName[];

export function contentFilePath(file: ContentFileName): string {
  return `client/content/${file}.json`;
}

const PUBLIC_ROOT = "client/public";
const MEDIA_ROOT = `${PUBLIC_ROOT}/media/`;

// Matches the formatting the repo's JSON files already use, so a commit from the editor
// produces a readable diff instead of reformatting every line.
export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

type MediaRef = { file: ContentFileName; path: string; src: string };

function mediaRefs(content: ContentFiles): MediaRef[] {
  const { site, projects } = content;
  const refs: MediaRef[] = [
    { file: "site", path: "profile.resumePath", src: site.profile.resumePath },
    { file: "site", path: "profile.portrait.src", src: site.profile.portrait.src },
  ];

  projects.selected.forEach((app, index) => {
    if (app.cover.kind === "image") {
      refs.push({ file: "projects", path: `selected[${index}].cover.src`, src: app.cover.src });
    }

    app.screenshots.forEach((shot, shotIndex) =>
      refs.push({ file: "projects", path: `selected[${index}].screenshots[${shotIndex}].src`, src: shot.src }),
    );
  });

  projects.archive.forEach((project, index) =>
    refs.push({ file: "projects", path: `archive[${index}].cover.src`, src: project.cover.src }),
  );

  return refs;
}

// Every site path the content points at, so a save can tell which uploads it still needs
// and which files it would leave dangling.
export function referencedMedia(content: ContentFiles): string[] {
  return Array.from(new Set(mediaRefs(content).map((ref) => ref.src)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinKey(path: string, key: string | number): string {
  if (typeof key === "number") {
    return `${path}[${key}]`;
  }

  return path ? `${path}.${key}` : key;
}

// First step of the trust boundary: only strings, arrays, and plain objects may reach
// the pinning and parity checks, which assume that shape.
function nodeProblem(value: unknown, path: string): { path: string; message: string } | null {
  if (typeof value === "string") {
    return null;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const problem = nodeProblem(value[index], joinKey(path, index));

      if (problem) {
        return problem;
      }
    }

    return null;
  }

  if (isRecord(value)) {
    for (const [key, member] of Object.entries(value)) {
      const problem = nodeProblem(member, joinKey(path, key));

      if (problem) {
        return problem;
      }
    }

    return null;
  }

  return { path, message: "Must be text, a list, or a group of fields." };
}

// The objects keyed by entry id. Their keys are the one place a draft may add or remove
// names; each entry inside is checked against its template by checkContentReferences.
const CONTAINERS = new Set(
  COLLECTIONS.flatMap((collection) =>
    collection.copy ? [`${collection.copy.domain}.${collection.copy.path.join(".")}`] : [],
  ),
);

// Arrays may grow and shrink, which is the point of "add an item", so only object keys
// are pinned to the repository's current files. Everything the editor cannot legitimately
// produce (new keys, changed kinds of value) is reported here.
function pinProblems(
  candidate: MessageNode,
  reference: MessageNode,
  path: string,
  trail: string,
  issues: ContentIssue[],
): void {
  const add = (at: string, message: string) => issues.push({ file: "messages", path: at, message });

  if (typeof reference === "string") {
    if (typeof candidate !== "string") {
      add(path, "Must be text.");
    }

    return;
  }

  if (Array.isArray(reference)) {
    if (!Array.isArray(candidate)) {
      add(path, "Must be a list.");
    } else if (reference.length === 0) {
      // An empty reference list carries no template, so nothing can be added to it.
      if (candidate.length > 0) {
        add(path, "This list has no template to add items from.");
      }
    } else {
      candidate.forEach((entry, index) =>
        pinProblems(entry, reference[0], joinKey(path, index), joinKey(trail, index), issues),
      );
    }

    return;
  }

  if (!isRecord(candidate) || Array.isArray(candidate)) {
    add(path, "Must be a group of fields.");

    return;
  }

  // `trail` is the position without the locale, which is what CONTAINERS is keyed by.
  if (CONTAINERS.has(trail)) {
    return;
  }

  const keys = Object.keys(candidate);

  for (const key of keys) {
    if (!Object.hasOwn(reference, key)) {
      add(joinKey(path, key), "This field does not exist in the repository's file.");
    }
  }

  for (const key of Object.keys(reference)) {
    if (!Object.hasOwn(candidate, key)) {
      add(joinKey(path, key), "This field is missing.");
    } else {
      pinProblems(candidate[key], reference[key], joinKey(path, key), joinKey(trail, key), issues);
    }
  }
}

const BLOB_SHA = /^[0-9a-f]{40}$/;

function hasTraversal(path: string): boolean {
  return path.includes("\\") || path.includes("//") || path.split("/").some((part) => part === ".." || part === ".");
}

function mediaProblems(
  media: unknown,
  resumePath: string,
  issues: ContentIssue[],
): PendingMedia[] | null {
  const add = (path: string, message: string) => issues.push({ file: "media", path, message });

  if (!Array.isArray(media)) {
    add("media", "Pending uploads must be a list.");

    return null;
  }

  const before = issues.length;
  const resumeRepoPath = `${PUBLIC_ROOT}${resumePath}`;

  const seen = new Set<string>();

  media.forEach((entry, index) => {
    const at = `media[${index}]`;

    if (
      !isRecord(entry) ||
      (entry.kind !== "image" && entry.kind !== "resume") ||
      typeof entry.repoPath !== "string" ||
      typeof entry.publicPath !== "string" ||
      typeof entry.sha !== "string" ||
      // A git blob id, exactly as createBlob returned it; anything else is not ours.
      !BLOB_SHA.test(entry.sha)
    ) {
      add(at, "Not a valid pending upload.");

      return;
    }

    const { kind, repoPath, publicPath } = entry as PendingMedia;

    if (seen.has(repoPath)) {
      add(`${at}.repoPath`, `${repoPath} is uploaded twice.`);

      return;
    }

    seen.add(repoPath);

    if (hasTraversal(repoPath) || hasTraversal(publicPath)) {
      add(`${at}.repoPath`, "Path may not contain . or .. segments.");
    } else if (kind === "image" && !(repoPath.startsWith(MEDIA_ROOT) && (repoPath.endsWith(".webp") || repoPath.endsWith(".jpg")))) {
      add(`${at}.repoPath`, `An image must be a .webp or .jpg file under ${MEDIA_ROOT}.`);
    } else if (kind === "resume" && (repoPath !== resumeRepoPath || !repoPath.endsWith(".pdf"))) {
      add(`${at}.repoPath`, `The CV can only be written to ${resumeRepoPath}.`);
    } else if (repoPath !== `${PUBLIC_ROOT}${publicPath}`) {
      add(`${at}.publicPath`, "Does not match the repository path.");
    }
  });

  return issues.length === before ? (media as PendingMedia[]) : null;
}

// `stoppedEarly` is true when a structural stage failed, so the reference and upload
// checks never ran and fixing these issues can surface more.
export type DraftCheck =
  | { ok: true; value: ContentDraft }
  | { ok: false; issues: ContentIssue[]; stoppedEarly: boolean };

// The server never trusts the client: this re-runs every rule the build runs, then pins
// the message structure to the repository's own files and confines uploads to the media
// folder and the CV path. The candidate's own key order is kept so an unchanged file
// serializes to the same bytes it was read as.
export function checkDraft(
  candidate: unknown,
  reference: ContentDraft,
  publicFiles: readonly string[],
): DraftCheck {
  if (!isRecord(candidate)) {
    return {
      ok: false,
      issues: [{ file: "messages", path: "", message: "Draft must be an object." }],
      stoppedEarly: true,
    };
  }

  const issues: ContentIssue[] = [];
  const add = (file: ContentIssue["file"], path: string, message: string) =>
    issues.push({ file, path, message });
  const { messages } = candidate;

  for (const locale of MESSAGE_LOCALES) {
    const domains = isRecord(messages) ? messages[locale] : undefined;

    if (!isRecord(domains)) {
      add("messages", locale, "The catalogue is missing.");
      continue;
    }

    for (const domain of MESSAGE_DOMAINS) {
      const where = `${locale}.${domain}`;
      const node = domains[domain];
      const problem = nodeProblem(node, where);

      if (problem) {
        add("messages", problem.path, problem.message);
      } else {
        pinProblems(node as MessageNode, reference.messages[locale][domain], where, domain, issues);
      }
    }
  }

  const rawContent = isRecord(candidate.content) ? candidate.content : {};
  const parsed = parseContentFiles({
    site: rawContent.site,
    portfolio: rawContent.portfolio,
    projects: rawContent.projects,
  });

  if (!parsed.ok) {
    issues.push(...parsed.issues);
  }

  // Everything below reads the parsed content and the message tree, so it only runs once
  // both are the shape the editor could have produced.
  if (issues.length > 0 || !parsed.ok) {
    return { ok: false, issues, stoppedEarly: true };
  }

  const catalogs = messages as MessageCatalogs;
  issues.push(...checkContentReferences(parsed.value, catalogs), ...checkCatalogParity(catalogs));

  // The CV URL is fixed (the editor never edits it, only replaces the file behind it), so
  // a candidate cannot move it, nor aim a CV upload anywhere else.
  const resumePath = reference.content.site.profile.resumePath;

  if (parsed.value.site.profile.resumePath !== resumePath) {
    add("site", "profile.resumePath", `The CV path is fixed at ${resumePath}.`);
  }

  const media = mediaProblems(candidate.media, resumePath, issues);
  issues.push(...checkClientNamesInPaths((media ?? []).map((item) => item.publicPath)));
  const available = new Set([...publicFiles, ...(media ?? []).map((item) => item.publicPath)]);

  for (const ref of mediaRefs(parsed.value)) {
    if (!available.has(ref.src)) {
      add(ref.file, ref.path, `No file at ${ref.src} in the repository or the pending uploads.`);
    }
  }

  if (issues.length > 0 || !media) {
    return { ok: false, issues, stoppedEarly: false };
  }

  return {
    ok: true,
    value: {
      content: {
        site: rawContent.site,
        portfolio: rawContent.portfolio,
        projects: rawContent.projects,
      } as ContentFiles,
      messages: catalogs,
      media,
    },
  };
}

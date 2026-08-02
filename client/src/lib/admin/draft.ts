import type { Locale } from "@/i18n/locale";
import type { MessageDomain } from "@/i18n/messages";
import { routing } from "@/i18n/routing";

// Message catalogues are plain JSON: nested objects, arrays for display order, and
// strings at every leaf. Nothing here has to survive a richer shape, and rejecting
// one is how the save path stays a trust boundary.
export type MessageNode = string | MessageNode[] | { [key: string]: MessageNode };

export type MessageDraft = Record<Locale, Record<MessageDomain, MessageNode>>;

export const MESSAGE_DOMAINS = [
  "common",
  "portfolio",
  "projects",
] as const satisfies readonly MessageDomain[];

export const MESSAGE_LOCALES = routing.locales;

export type NodePath = readonly (string | number)[];

// Same shape as the parity assertions in i18n/messages.test.ts, so a draft that
// passes here is a draft that keeps those tests green.
export function leafPaths(node: MessageNode, prefix = ""): string[] {
  if (typeof node === "string") {
    return [prefix];
  }

  if (Array.isArray(node)) {
    return node.flatMap((entry, index) => leafPaths(entry, `${prefix}[${index}]`));
  }

  return Object.entries(node).flatMap(([key, value]) =>
    leafPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

export function placeholdersOf(text: string): string[] {
  return (text.match(/\{[^{}]*\}/g) ?? []).sort();
}

function leafEntries(node: MessageNode, prefix = ""): [string, string][] {
  if (typeof node === "string") {
    return [[prefix, node]];
  }

  if (Array.isArray(node)) {
    return node.flatMap((entry, index) => leafEntries(entry, `${prefix}[${index}]`));
  }

  return Object.entries(node).flatMap(([key, value]) =>
    leafEntries(value, prefix ? `${prefix}.${key}` : key),
  );
}

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

export type DraftCheck = { ok: true; value: MessageDraft } | { ok: false; error: string };

// Arrays may grow and shrink — that is the whole point of "add an item" — so only
// object keys are pinned to the reference. Everything the editor cannot legitimately
// produce (new keys, nested nulls, numbers where a string belongs) is rejected here.
function matchesShape(candidate: unknown, reference: MessageNode): boolean {
  if (typeof reference === "string") {
    return typeof candidate === "string";
  }

  if (Array.isArray(reference)) {
    if (!Array.isArray(candidate)) {
      return false;
    }

    // An empty reference array carries no template, so nothing can be validated
    // against it and nothing may be added to it.
    if (reference.length === 0) {
      return candidate.length === 0;
    }

    // Every entry of a message array shares one shape, so the first reference entry
    // is the template each candidate entry has to match.
    return candidate.every((entry) => matchesShape(entry, reference[0]));
  }

  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return false;
  }

  const candidateKeys = Object.keys(candidate).sort();
  const referenceKeys = Object.keys(reference).sort();

  if (candidateKeys.length !== referenceKeys.length) {
    return false;
  }

  return referenceKeys.every(
    (key, index) =>
      candidateKeys[index] === key &&
      matchesShape((candidate as Record<string, unknown>)[key], reference[key]),
  );
}

export function checkDraft(candidate: unknown, reference: MessageDraft): DraftCheck {
  if (typeof candidate !== "object" || candidate === null) {
    return { ok: false, error: "Draft must be an object." };
  }

  const draft = candidate as Record<string, unknown>;

  for (const locale of MESSAGE_LOCALES) {
    const domains = draft[locale];

    if (typeof domains !== "object" || domains === null) {
      return { ok: false, error: `Draft is missing the ${locale} catalogue.` };
    }

    for (const domain of MESSAGE_DOMAINS) {
      const node = (domains as Record<string, unknown>)[domain];

      if (!matchesShape(node, reference[locale][domain])) {
        return {
          ok: false,
          error: `${locale}/${domain}.json no longer matches the file it came from.`,
        };
      }
    }
  }

  const value = draft as MessageDraft;

  for (const domain of MESSAGE_DOMAINS) {
    const english = leafEntries(value.en[domain]);
    const indonesian = leafEntries(value.id[domain]);
    const translations = new Map(indonesian);

    for (const [label, entries] of [
      ["English", english],
      ["Indonesian", indonesian],
    ] as const) {
      const blank = entries.find(([, text]) => text.trim() === "");

      if (blank) {
        return { ok: false, error: `${label} ${domain}.json still has an empty field: ${blank[0]}` };
      }
    }

    if (english.length !== indonesian.length) {
      return {
        ok: false,
        error: `${domain}.json has a different number of entries per language.`,
      };
    }

    for (const [path, text] of english) {
      const translated = translations.get(path);

      if (translated === undefined) {
        return { ok: false, error: `Indonesian ${domain}.json is missing ${path}.` };
      }

      // A placeholder present in one language and not the other renders as a literal
      // "{name}" or throws at request time, so it never reaches a commit.
      if (placeholdersOf(text).join("|") !== placeholdersOf(translated).join("|")) {
        return {
          ok: false,
          error: `${domain}.json placeholders differ between languages at ${path}.`,
        };
      }
    }
  }

  return { ok: true, value };
}

// Matches the formatting the repo's JSON files already use, so a commit from the CMS
// produces a readable diff instead of reformatting every line.
export function serializeMessages(node: MessageNode): string {
  return `${JSON.stringify(node, null, 2)}\n`;
}

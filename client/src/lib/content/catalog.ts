import type { Locale } from "@/i18n/locale";
import type { MessageDomain } from "@/i18n/messages";

import type { ContentIssue } from "./validate";

// Message catalogues are plain JSON: nested objects, arrays for display order, and
// strings at every leaf. Nothing here has to survive a richer shape, and rejecting
// one is how the save path stays a trust boundary.
export type MessageNode = string | MessageNode[] | { [key: string]: MessageNode };

export type NodePath = readonly (string | number)[];

export type MessageCatalogs = Record<Locale, Record<MessageDomain, MessageNode>>;

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

export function leafEntries(node: MessageNode, prefix = ""): [string, string][] {
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

export function placeholdersOf(text: string): string[] {
  return (text.match(/\{[^{}]*\}/g) ?? []).sort();
}

const DOMAINS: readonly MessageDomain[] = ["common", "portfolio", "projects"];
const LOCALES: readonly Locale[] = ["en", "id"];

export type ParityProblem =
  | { kind: "blank"; locale: Locale; domain: MessageDomain; path: string }
  | { kind: "count"; domain: MessageDomain }
  | { kind: "missing"; locale: Locale; domain: MessageDomain; path: string }
  | { kind: "placeholders"; domain: MessageDomain; path: string };

// The one definition of the en/id parity rules. checkDraft stops at the first problem
// and words it for the editor; checkCatalogParity lists them all for a content check.
// The order (blank, count, missing/placeholders) is what keeps checkDraft's messages stable.
export function parityProblems(
  catalogs: MessageCatalogs,
  domains: readonly MessageDomain[] = DOMAINS,
): ParityProblem[] {
  const problems: ParityProblem[] = [];

  for (const domain of domains) {
    const english = leafEntries(catalogs.en[domain]);
    const indonesian = leafEntries(catalogs.id[domain]);
    const translations = new Map(indonesian);
    const originals = new Map(english);

    for (const [locale, entries] of [
      ["en", english],
      ["id", indonesian],
    ] as const) {
      for (const [path, text] of entries) {
        if (text.trim() === "") {
          problems.push({ kind: "blank", locale, domain, path });
          break;
        }
      }
    }

    if (english.length !== indonesian.length) {
      problems.push({ kind: "count", domain });
    }

    for (const [path, text] of english) {
      const translated = translations.get(path);

      if (translated === undefined) {
        problems.push({ kind: "missing", locale: "id", domain, path });
      } else if (placeholdersOf(text).join("|") !== placeholdersOf(translated).join("|")) {
        // A placeholder present in one language and not the other renders as a literal
        // "{name}" or throws at request time.
        problems.push({ kind: "placeholders", domain, path });
      }
    }

    for (const [path] of indonesian) {
      if (!originals.has(path)) {
        problems.push({ kind: "missing", locale: "en", domain, path });
      }
    }
  }

  return problems;
}

export function checkCatalogParity(catalogs: MessageCatalogs): ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const problem of parityProblems(catalogs)) {
    if (problem.kind === "count") {
      continue;
    }

    if (problem.kind === "blank") {
      issues.push({
        file: "messages",
        path: `${problem.locale}.${problem.domain}.${problem.path}`,
        message: "Field is empty.",
      });
    } else if (problem.kind === "missing") {
      issues.push({
        file: "messages",
        path: `${problem.locale}.${problem.domain}.${problem.path}`,
        message: "Missing; the other catalogue has it.",
      });
    } else {
      issues.push({
        file: "messages",
        path: `id.${problem.domain}.${problem.path}`,
        message: "Placeholders differ between languages.",
      });
    }
  }

  return issues;
}

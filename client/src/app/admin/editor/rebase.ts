import { MESSAGE_DOMAINS, MESSAGE_LOCALES, referencedMedia, type ContentDraft } from "@/lib/admin/draft";
import type { ContentFiles } from "@/lib/content/schema";

// Re-applies a browser backup onto a base that moved on since it was saved. The backup
// carries the base it was made from, so its own edits are known exactly: every leaf the
// backup changed is written onto the newly loaded base, every leaf it left alone takes
// the new base's value. A leaf changed on both sides keeps the backup's value and is
// listed, so the restore prompt can say what to check. Pure, so it is tested without a
// browser.

export type Rebase = { draft: ContentDraft; conflicts: string[] };

type Json = unknown;
type Entry = Record<string, unknown>;

function same(a: Json, b: Json): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isObject(value: Json): value is Entry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyOf(value: Json): string | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const key = value.id ?? value.slug;

  return typeof key === "string" ? key : undefined;
}

// Collection entries (anything carrying an id or a slug) merge by identity, so an entry
// added or moved upstream does not shift the local edits onto its neighbour.
function isKeyed(...lists: Json[][]): boolean {
  const all = lists.flat();

  return all.length > 0 && all.every((item) => keyOf(item) !== undefined);
}

function join(path: string, part: string | number): string {
  if (typeof part === "number") {
    return `${path}[${part}]`;
  }

  return path ? `${path}.${part}` : part;
}

function mergeKeyed(old: Json[], local: Json[], upstream: Json[], path: string, conflicts: string[]): Json[] {
  const byKey = (list: Json[]) => new Map(list.map((item) => [keyOf(item)!, item]));
  const [o, l, n] = [byKey(old), byKey(local), byKey(upstream)];
  const merged = new Map<string, Json>();

  const keys = [...upstream, ...local, ...old].map((item) => keyOf(item)!);

  for (const key of keys.filter((candidate, index) => keys.indexOf(candidate) === index)) {
    const at = `${path}[id=${key}]`;

    if (!l.has(key) && !n.has(key)) {
      continue;
    }

    if (!o.has(key)) {
      // Added on one side, or on both.
      merged.set(key, l.has(key) && n.has(key) ? merge(undefined, l.get(key), n.get(key), at, conflicts) : (l.get(key) ?? n.get(key)));
      continue;
    }

    if (!l.has(key)) {
      // Deleted locally; an upstream edit to it is the conflict, and the deletion stands.
      if (n.has(key) && !same(n.get(key), o.get(key))) {
        conflicts.push(at);
      }

      continue;
    }

    if (!n.has(key)) {
      // Deleted upstream; a local edit to it brings it back.
      if (!same(l.get(key), o.get(key))) {
        conflicts.push(at);
        merged.set(key, l.get(key));
      }

      continue;
    }

    merged.set(key, merge(o.get(key), l.get(key), n.get(key), at, conflicts));
  }

  // Order: the local one when only the backup reordered, otherwise upstream's. Keys the
  // chosen order does not know go at the end in the other side's order.
  const common = (list: Json[], other: Map<string, Json>) => list.map(keyOf).filter((key) => other.has(key!));
  const localMoved = !same(common(local, o), common(old, l));
  const upstreamMoved = !same(common(upstream, o), common(old, n));

  if (localMoved && upstreamMoved && !same(common(local, n), common(upstream, l))) {
    conflicts.push(`${path} (order)`);
  }

  const first = localMoved ? local : upstream;
  const second = localMoved ? upstream : local;
  const order = [...first, ...second].map((item) => keyOf(item)!).filter((key, index, all) => all.indexOf(key) === index);

  return order.filter((key) => merged.has(key)).map((key) => merged.get(key));
}

function merge(old: Json, local: Json, upstream: Json, path: string, conflicts: string[]): Json {
  if (same(local, old)) {
    return upstream;
  }

  if (same(upstream, old) || same(local, upstream)) {
    return local;
  }

  if (isObject(local) && isObject(upstream) && (old === undefined || isObject(old))) {
    const base: Entry = old === undefined ? {} : old;
    const out: Entry = {};

    const keys = [...Object.keys(upstream), ...Object.keys(local)];

    for (const key of keys.filter((candidate, index) => keys.indexOf(candidate) === index)) {
      const value = merge(base[key], local[key], upstream[key], join(path, key), conflicts);

      if (value !== undefined) {
        out[key] = value;
      }
    }

    return out;
  }

  if (Array.isArray(local) && Array.isArray(upstream) && Array.isArray(old)) {
    if (isKeyed(old, local, upstream)) {
      return mergeKeyed(old, local, upstream, path, conflicts);
    }

    if (old.length === local.length && local.length === upstream.length) {
      return local.map((item, index) => merge(old[index], item, upstream[index], join(path, index), conflicts));
    }
  }

  conflicts.push(path);

  return local;
}

export function rebaseDraft(old: ContentDraft, local: ContentDraft, upstream: ContentDraft): Rebase {
  const conflicts: string[] = [];
  const files = ["site", "portfolio", "projects"] as const;
  const content = Object.fromEntries(
    files.map((file) => [file, merge(old.content[file], local.content[file], upstream.content[file], file, conflicts)]),
  ) as ContentFiles;

  const messages = Object.fromEntries(
    MESSAGE_LOCALES.map((locale) => [
      locale,
      Object.fromEntries(
        MESSAGE_DOMAINS.map((domain) => [
          domain,
          merge(
            old.messages[locale][domain],
            local.messages[locale][domain],
            upstream.messages[locale][domain],
            `${locale}:${domain}`,
            conflicts,
          ),
        ]),
      ),
    ]),
  ) as ContentDraft["messages"];

  // A pending upload rides along only while the merged content still points at it.
  const used = new Set(referencedMedia(content));
  const media = local.media.filter((entry) => used.has(entry.publicPath));

  return { draft: { content, messages, media }, conflicts };
}

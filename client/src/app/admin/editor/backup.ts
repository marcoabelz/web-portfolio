import { MESSAGE_DOMAINS, MESSAGE_LOCALES, type ContentDraft } from "@/lib/admin/draft";
import { parseContentFiles } from "@/lib/content/validate";

import { rebaseDraft } from "./rebase";

// A copy of the unpublished draft in the browser, so an expired session or a closed tab
// does not lose an hour of edits. Storage can be missing or throw (private windows,
// blocked site data), so nothing here ever throws.

export const BACKUP_KEY = "portfolio-admin-draft";
// Edits made while the restore offer is open go here, so the offered draft stays intact.
export const EDITS_KEY = "portfolio-admin-draft-edits";

// Which key a backup write uses: the offered draft is never overwritten.
export function backupKey(offerOpen: boolean): string {
  return offerOpen ? EDITS_KEY : BACKUP_KEY;
}

// Between a leftover main copy and a leftover edits copy, the newer one is offered.
export function newerBackup(a: Backup | null, b: Backup | null): Backup | null {
  if (!a || !b) {
    return a ?? b;
  }

  return Date.parse(b.savedAt) >= Date.parse(a.savedAt) ? b : a;
}

// `base` is the repository draft the edits were made on, so a restore against a newer
// site can re-apply just those edits. Backups saved before it existed have none.
export type Backup = { draft: ContentDraft; baseSha: string; savedAt: string; base?: ContentDraft };

export function saveBackup(storage: Storage | undefined, backup: Backup, key: string = BACKUP_KEY): void {
  try {
    storage?.setItem(key, JSON.stringify(backup));
  } catch {
    // Quota or blocked storage: the backup is a convenience.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Only a draft the site could build is worth offering: content that passes the same
// schema the build runs, and every message domain in both locales.
function isDraft(value: unknown): value is ContentDraft {
  if (!isRecord(value) || !isRecord(value.content) || !isRecord(value.messages) || !Array.isArray(value.media)) {
    return false;
  }

  const { content, messages } = value;

  return (
    parseContentFiles({ site: content.site, portfolio: content.portfolio, projects: content.projects }).ok &&
    MESSAGE_LOCALES.every((locale) => {
      const domains = messages[locale];

      return isRecord(domains) && MESSAGE_DOMAINS.every((domain) => isRecord(domains[domain]));
    })
  );
}

function asBackup(value: unknown): Backup | null {
  if (!isRecord(value)) {
    return null;
  }

  const { draft, baseSha, savedAt, base } = value;

  if (typeof baseSha !== "string" || typeof savedAt !== "string" || !isDraft(draft)) {
    return null;
  }

  // A broken base only costs the rebase: the draft restores the way it always did.
  return isDraft(base) ? { draft, baseSha, savedAt, base } : { draft, baseSha, savedAt };
}

export function loadBackup(storage: Storage | undefined, key: string = BACKUP_KEY): Backup | null {
  try {
    const raw = storage?.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    return asBackup(parsed);
  } catch {
    return null;
  }
}

export function clearBackup(storage: Storage | undefined, key: string = BACKUP_KEY): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

// A publish makes every stored copy stale: offering one later would undo the publish.
export function clearAfterPublish(storage: Storage | undefined): void {
  clearBackup(storage, BACKUP_KEY);
  clearBackup(storage, EDITS_KEY);
}

export type RestorePlan = {
  draft: ContentDraft;
  // Leaves changed both in the backup and on the site since; the backup's value wins.
  conflicts: string[];
  siteChanged: boolean;
  // True when only the backup's own edits are re-applied onto the current site.
  rebased: boolean;
};

// What Restore would load. On the same base it is the snapshot itself; on a newer base
// the backup's edits are rebased onto it when the backup knows its own base, and
// otherwise the old whole-snapshot restore stands, with the "site changed" warning.
export function planRestore(backup: Backup, base: ContentDraft, baseSha: string): RestorePlan {
  if (backup.baseSha === baseSha) {
    return { draft: backup.draft, conflicts: [], siteChanged: false, rebased: false };
  }

  if (!backup.base) {
    return { draft: backup.draft, conflicts: [], siteChanged: true, rebased: false };
  }

  const { draft, conflicts } = rebaseDraft(backup.base, backup.draft, base);

  return { draft, conflicts, siteChanged: true, rebased: true };
}

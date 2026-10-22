import { commitMessage, countChanges, diffDraft, type ChangeGroup } from "@/lib/admin/diff";
import {
  checkDraft,
  CONTENT_FILES,
  MESSAGE_DOMAINS,
  MESSAGE_LOCALES,
  referencedMedia,
  serializeJson,
  type ContentDraft,
} from "@/lib/admin/draft";
import type { SectionDef } from "@/lib/admin/schema";
import { COLLECTIONS, type CollectionDef } from "@/lib/content/collections";
import type { ContentIssue } from "@/lib/content/validate";

export type Review = {
  groups: ChangeGroup[];
  issues: ContentIssue[];
  message: string;
  canPublish: boolean;
  // A structural check failed, so the reference and upload checks have not run yet.
  moreChecks: boolean;
  // Files would differ on disk although no field lists a change (formatting, key order,
  // or a field the editor does not map). Publishing then writes them as "content: update".
  unlisted: boolean;
};

function filesDiffer(base: ContentDraft, draft: ContentDraft): boolean {
  if (CONTENT_FILES.some((file) => serializeJson(base.content[file]) !== serializeJson(draft.content[file]))) {
    return true;
  }

  const stored = new Set(base.media.map((item) => item.repoPath));
  const used = new Set(referencedMedia(draft.content));

  if (draft.media.some((item) => !stored.has(item.repoPath) && used.has(item.publicPath))) {
    return true;
  }

  return MESSAGE_LOCALES.some((locale) =>
    MESSAGE_DOMAINS.some(
      (domain) => serializeJson(base.messages[locale][domain]) !== serializeJson(draft.messages[locale][domain]),
    ),
  );
}

// What the dialog shows before anything is sent. The issues come from the same checks the
// server runs, with `base` standing in for the repository's current files; the server
// still pins the draft to the real ones, and a mismatch there comes back as "invalid".
//
// Nothing to publish is decided the way saveDraft decides it: no changed bytes means no
// commit, and a change no field names is still published (as "content: update").
export function buildReview(base: ContentDraft, draft: ContentDraft, publicFiles: readonly string[]): Review {
  const groups = diffDraft(base, draft);
  const checked = checkDraft(draft, base, publicFiles);
  const issues = checked.ok ? [] : checked.issues;
  const listed = countChanges(groups) > 0;
  const unlisted = !listed && filesDiffer(base, draft);

  return {
    groups,
    issues,
    message: listed ? commitMessage(groups) : "content: update",
    canPublish: issues.length === 0 && (listed || unlisted),
    moreChecks: !checked.ok && checked.stoppedEarly,
    unlisted,
  };
}

export function isSaveShortcut(event: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
}

const LOCALE_NAMES: Record<string, string> = { en: "English", id: "Indonesian" };

function collectionFor(issue: ContentIssue): { def: CollectionDef; at: string } | null {
  for (const def of COLLECTIONS) {
    if (issue.file === "messages" && def.copy) {
      const prefix = `${def.copy.domain}.${def.copy.path.join(".")}.`;
      const match = /^(en|id)\.(.+)$/.exec(issue.path);

      if (match && match[2].startsWith(prefix)) {
        return { def, at: match[2].slice(prefix.length).split(/[.[]/)[0] + `|${match[1]}` };
      }
    } else if (issue.file === def.facts.file) {
      const prefix = `${def.facts.path.join(".")}[`;

      if (issue.path.startsWith(prefix)) {
        return { def, at: issue.path.slice(prefix.length).split("]")[0] };
      }
    }
  }

  return null;
}

// "portfolio lab[0].archiveId" becomes "Lab › xiaopee: ..." so the editor can see which
// section and entry to fix. The draft is optional; without it a fact is named by position.
export function issueLabel(issue: ContentIssue, sections: readonly SectionDef[], draft?: ContentDraft): string {
  if (issue.file === "media") {
    return `Uploads › ${issue.path}: ${issue.message}`;
  }

  const found = collectionFor(issue);

  if (found) {
    const section = sections.find((candidate) =>
      candidate.fields.some((field) => field.kind === "collection" && field.collection === found.def.id),
    );

    if (section) {
      if (issue.file === "messages") {
        const [id, locale] = found.at.split("|");

        return `${section.title} › ${id} (${LOCALE_NAMES[locale] ?? locale}): ${issue.message}`;
      }

      const list = draft?.content[found.def.facts.file] as unknown as Record<string, unknown> | undefined;
      let entries: unknown = list;

      for (const key of found.def.facts.path) {
        entries = (entries as Record<string, unknown> | undefined)?.[key];
      }

      const entry = Array.isArray(entries) ? (entries[Number(found.at)] as Record<string, unknown> | undefined) : undefined;
      const id = entry ? String(entry[found.def.idKey]) : `#${Number(found.at) + 1}`;

      return `${section.title} › ${id}: ${issue.message}`;
    }
  }

  return `${issue.file} › ${issue.path || "draft"}: ${issue.message}`;
}

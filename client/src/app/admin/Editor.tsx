"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";

import { countChanges, diffDraft } from "@/lib/admin/diff";
import type { ContentDraft } from "@/lib/admin/draft";
import { EDITOR_SECTIONS, uncoveredCopyPaths, type SectionDef } from "@/lib/admin/schema";

import { logout, saveDraft, searchIcons, uploadMedia } from "./actions";
import {
  backupKey,
  clearAfterPublish,
  clearBackup,
  EDITS_KEY,
  loadBackup,
  newerBackup,
  planRestore,
  saveBackup,
  type Backup,
} from "./editor/backup";
import { EditorLayout, type EditorHandlers } from "./editor/EditorLayout";
import { prepareImage } from "./editor/prepare-image";
import { RestorePrompt } from "./editor/RestorePrompt";
import { buildReview, isSaveShortcut, type Review } from "./editor/review";
import { ReviewDialog, type PublishOutcome } from "./editor/ReviewDialog";
import { editorReducer as baseReducer, stalePreviewUrls, type EditorAction, type EditorState } from "./editor/state";

const BACKUP_DELAY_MS = 800;

// An attach the reducer drops (its target is gone) leaves an object URL nothing else
// knows about, so it is revoked here. Revoking twice is harmless, which matters because
// React may run a reducer more than once.
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const next = baseReducer(state, action);

  if (action.type === "attachMedia" && next === state) {
    URL.revokeObjectURL(action.preview);
  }

  return next;
}

const OTHER_SECTION: SectionDef = {
  id: "other",
  title: "Other",
  where: "Copy that no other section reaches",
  viewPath: "/",
  fields: [],
};

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function Editor({
  draft,
  baseSha,
  publicFiles,
  repo,
  branch,
}: Readonly<{
  draft: ContentDraft;
  baseSha: string;
  // Every public file on the branch; the media picker reads it.
  publicFiles: readonly string[];
  repo: string;
  branch: string;
}>) {
  const sections = useMemo(
    () =>
      uncoveredCopyPaths(EDITOR_SECTIONS, draft).length > 0
        ? [...EDITOR_SECTIONS, OTHER_SECTION]
        : EDITOR_SECTIONS,
    [draft],
  );

  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    (): EditorState => ({
      base: draft,
      draft,
      baseSha,
      publicFiles: [...publicFiles],
      section: sections[0].id,
      query: "",
      previews: {},
    }),
  );
  const [backup, setBackup] = useState<Backup | null>(null);
  // What Restore would load: rebased onto the current site when the backup knows its base.
  const restorePlan = useMemo(
    () => (backup ? planRestore(backup, state.base, state.baseSha) : null),
    [backup, state.base, state.baseSha],
  );
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [, startSigningOut] = useTransition();
  // The review is a snapshot taken when the dialog opens; the modal blocks edits, so it
  // cannot go stale, and it survives the publish emptying the diff.
  const [reviewing, setReviewing] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [outcome, setOutcome] = useState<PublishOutcome | null>(null);
  const [now, setNow] = useState(0);

  const changes = useMemo(() => countChanges(diffDraft(state.base, state.draft)), [state.base, state.draft]);

  // Object URLs outlive the state that held them, so the ones the reducer dropped are
  // revoked after every change, and all of them when the editor goes away.
  const previews = useRef(state.previews);

  useEffect(() => {
    for (const url of stalePreviewUrls(previews.current, state.previews)) {
      URL.revokeObjectURL(url);
    }

    previews.current = state.previews;
  }, [state.previews]);

  useEffect(
    () => () => {
      for (const url of Object.values(previews.current)) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  // A draft left behind by an expired session or a closed tab is offered back once.
  useEffect(() => {
    const found = newerBackup(loadBackup(storage()), loadBackup(storage(), EDITS_KEY));

    if (found && countChanges(diffDraft(state.base, planRestore(found, state.base, state.baseSha).draft)) > 0) {
      setBackup(found);
      setNow(Date.now());
    }
    // Only the draft the page loaded with decides this, never later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The backup is cleared when edits drop back to nothing (publish or discard), never on
  // first load, where an untouched editor must not erase the draft it is about to offer.
  const hadChanges = useRef(false);

  useEffect(() => {
    // While the offer is open, edits go to a second key so the offered draft stays
    // recoverable; Restore replaces them, Discard promotes them to the main key.
    const key = backupKey(backup !== null);

    if (changes === 0) {
      if (hadChanges.current) {
        hadChanges.current = false;
        clearBackup(storage(), key);
      }

      return;
    }

    hadChanges.current = true;

    const timer = window.setTimeout(
      () =>
        saveBackup(
          storage(),
          { draft: state.draft, base: state.base, baseSha: state.baseSha, savedAt: new Date().toISOString() },
          key,
        ),
      BACKUP_DELAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, [changes, state.draft, state.base, state.baseSha, backup]);

  // Closing the tab mid-edit would otherwise throw away every field typed since the
  // last publish.
  useEffect(() => {
    if (changes === 0) {
      return;
    }

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [changes]);

  const review = useCallback(() => {
    setReviewing(buildReview(state.base, state.draft, state.publicFiles));
    setOutcome(null);
    setDialogOpen(true);
  }, [state.base, state.draft, state.publicFiles]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isSaveShortcut(event)) {
        // Always swallowed: the browser's own "save page" is never what was meant here.
        event.preventDefault();

        if (changes > 0 && !dialogOpen) {
          review();
        }
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [changes, dialogOpen, review]);

  const publish = useCallback(async () => {
    const submitted = state.draft;

    setPublishing(true);

    try {
      const result = await saveDraft(submitted, state.baseSha);

      if (result.ok) {
        dispatch({ type: "published", draft: submitted, baseSha: result.commitSha });
        setOutcome({ kind: "published", sha: result.commitSha });
        // Every stored copy predates this publish; offering one later would undo it.
        clearAfterPublish(storage());
        setBackup(null);

        return;
      }

      // Whatever went wrong, the draft must survive it, so the copy is written now
      // rather than after the debounce.
      if (result.reason !== "invalid") {
        saveBackup(
          storage(),
          { draft: submitted, base: state.base, baseSha: state.baseSha, savedAt: new Date().toISOString() },
          backupKey(backup !== null),
        );
      }

      setOutcome(
        result.reason === "invalid"
          ? { kind: "invalid", issues: result.issues }
          : result.reason === "error"
            ? { kind: "error", message: result.message }
            : { kind: result.reason },
      );
    } catch {
      setOutcome({ kind: "error", message: "The request did not go through. Check your connection and try again." });
    } finally {
      setPublishing(false);
    }
  }, [backup, state.base, state.baseSha, state.draft]);

  const handlers = useMemo<EditorHandlers>(
    () => ({
      async upload(kind, file, target) {
        try {
          const form = new FormData();
          form.set("kind", kind);

          if (kind === "image") {
            const { blob, width, height } = await prepareImage(file);
            const name = file.name.replace(/\.[^.]+$/, "") || "image";

            form.set("file", new File([blob], `${name}.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }));
            form.set("width", String(width));
            form.set("height", String(height));

            const result = await uploadMedia(form);

            if (!result.ok) {
              return result.error;
            }

            if (result.media.kind !== "image" || result.width === undefined || result.height === undefined) {
              return "The upload came back without a size.";
            }

            dispatch({
              type: "attachMedia",
              media: { ...result.media, kind: "image" },
              target,
              size: { width: result.width, height: result.height },
              preview: URL.createObjectURL(blob),
            });

            return null;
          }

          form.set("file", file);
          form.set("resumePath", String(draftResumePath(state.draft)));

          const result = await uploadMedia(form);

          if (!result.ok) {
            return result.error;
          }

          dispatch({ type: "attachMedia", media: { ...result.media, kind: "resume" }, preview: URL.createObjectURL(file) });

          return null;
        } catch (error) {
          return error instanceof Error ? error.message : "The upload failed.";
        }
      },
      searchIcons,
      review,
      signOut() {
        startSigningOut(async () => {
          await logout();
        });
      },
    }),
    [review, state.draft],
  );

  return (
    <EditorLayout
      banner={backup && restorePlan ? (
        <RestorePrompt
          savedAt={backup.savedAt}
          now={now}
          siteChanged={restorePlan.siteChanged}
          rebased={restorePlan.rebased}
          conflicts={restorePlan.conflicts}
          onRestore={() => {
            dispatch({ type: "restore", draft: restorePlan.draft });

            if (restorePlan.siteChanged && (!restorePlan.rebased || restorePlan.conflicts.length > 0)) {
              setStatus({
                tone: "error",
                message: restorePlan.rebased
                  ? `Your version was kept where the site also changed: ${restorePlan.conflicts.join(", ")}. Review before publishing.`
                  : "The site changed since this draft was saved; review carefully before publishing.",
              });
            }

            clearBackup(storage(), EDITS_KEY);
            setBackup(null);
          }}
          onDiscard={() => {
            clearBackup(storage());
            clearBackup(storage(), EDITS_KEY);
            setBackup(null);
          }}
        />
      ) : null}
      state={state}
        dispatch={dispatch}
        handlers={handlers}
        repo={repo}
        branch={branch}
        sections={sections}
        status={status}
        changes={changes}
        overlay={
          reviewing ? (
            <ReviewDialog
              review={reviewing}
              draft={state.draft}
              open={dialogOpen}
              repo={repo}
              publishing={publishing}
              outcome={outcome}
              previews={state.previews}
              onPublish={publish}
              onClose={() => setDialogOpen(false)}
              onReload={() => window.location.reload()}
            />
          ) : null
        }
      />
  );
}

function draftResumePath(draft: ContentDraft): string {
  return draft.content.site.profile.resumePath;
}

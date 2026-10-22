"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { readAdminConfig } from "@/lib/admin/config";
import {
  checkDraft,
  CONTENT_FILES,
  contentFilePath,
  MESSAGE_DOMAINS,
  MESSAGE_LOCALES,
  referencedMedia,
  serializeJson,
  type ContentDraft,
  type PendingMedia,
} from "@/lib/admin/draft";
import { commitMessage, countChanges, diffDraft } from "@/lib/admin/diff";
import {
  BranchMovedError,
  commitDraft,
  createBlob,
  messagePath,
  readDraft,
} from "@/lib/admin/github";
import { checkUpload, mediaPaths, type IconResult } from "@/lib/admin/media";
import { MAX_UPLOAD_BYTES } from "@/lib/admin/upload-limits";
import {
  createSessionToken,
  credentialsMatch,
  isSessionValid,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin/session";
import { searchBrandIcons } from "@/lib/icons";
import { pdfPath } from "@/lib/content/schema";
import { checkRateLimit, clientKey } from "@/lib/chat/rate-limit";
import type { ContentIssue } from "@/lib/content/validate";

export type SaveResult =
  | { ok: true; commitSha: string; commitUrl: string }
  | { ok: false; reason: "invalid"; issues: ContentIssue[] }
  | { ok: false; reason: "conflict" | "signed-out" | "error"; message: string };

const BRANCH_MOVED =
  "The site was updated after you opened the editor. Your draft is kept; reload to pick up the changes.";

export async function login(formData: FormData): Promise<void> {
  const config = readAdminConfig();

  if (!config) {
    redirect("/admin");
  }

  // Five attempts a minute per IP. Without it the single account's password is
  // guessable at request speed, and this account can commit to the repository.
  if (!checkRateLimit(`admin:${clientKey(headers())}`)) {
    redirect("/admin?error=throttled");
  }

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/admin?error=credentials");
  }

  if (!credentialsMatch({ email, password }, config)) {
    redirect("/admin?error=credentials");
  }

  cookies().set(
    SESSION_COOKIE,
    createSessionToken(
      config.sessionSecret,
      Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  );

  redirect("/admin");
}

export async function logout(): Promise<void> {
  cookies().delete({ name: SESSION_COOKIE, path: "/admin" });

  redirect("/admin");
}

export async function saveDraft(
  draft: ContentDraft,
  baseSha: string,
): Promise<SaveResult> {
  const config = readAdminConfig();

  if (!config) {
    return {
      ok: false,
      reason: "error",
      message: "The editor is not configured.",
    };
  }

  // A server action is a public endpoint: the session is re-checked here rather than
  // trusted from whatever rendered the page that called it. Signing out is an answer,
  // not an exception, so the editor can keep the draft and offer it back after sign-in.
  if (
    !isSessionValid(cookies().get(SESSION_COOKIE)?.value, config.sessionSecret)
  ) {
    return {
      ok: false,
      reason: "signed-out",
      message:
        "You are signed out. Your draft is kept in this browser; sign in to restore it.",
    };
  }

  try {
    const current = await readDraft(config);

    if (current.baseSha !== baseSha) {
      return { ok: false, reason: "conflict", message: BRANCH_MOVED };
    }

    const checked = checkDraft(draft, current.draft, current.publicFiles);

    if (!checked.ok) {
      return { ok: false, reason: "invalid", issues: checked.issues };
    }

    const { content, messages, media } = checked.value;

    // Pending uploads the draft stopped using (an image that was replaced again) are
    // left out so they never land in the repository.
    const used = new Set(referencedMedia(content));
    const blobs = media
      .filter((item) => used.has(item.publicPath))
      .map((item) => ({ path: item.repoPath, sha: item.sha }));

    const wanted = [
      ...CONTENT_FILES.map((file) => ({
        path: contentFilePath(file),
        content: serializeJson(content[file]),
        before: serializeJson(current.draft.content[file]),
      })),
      ...MESSAGE_LOCALES.flatMap((locale) =>
        MESSAGE_DOMAINS.map((domain) => ({
          path: messagePath(locale, domain),
          content: serializeJson(messages[locale][domain]),
          before: serializeJson(current.draft.messages[locale][domain]),
        })),
      ),
    ];

    // Only files whose bytes changed are written, so a one-field edit is a one-file diff.
    const files = wanted
      .filter((file) => file.content !== file.before)
      .map(({ path, content: text }) => ({ path, content: text }));

    // An empty commit still triggers a Vercel build, so a no-op save stays a no-op.
    const groups = diffDraft(current.draft, checked.value);

    if (files.length === 0 && blobs.length === 0) {
      return { ok: false, reason: "error", message: "Nothing to publish." };
    }

    const commitSha = await commitDraft(config, {
      baseSha,
      files,
      blobs,
      // A byte-level change the review could not name still gets a plain message.
      message:
        countChanges(groups) > 0 ? commitMessage(groups) : "content: update",
    });

    return {
      ok: true,
      commitSha,
      commitUrl: `https://github.com/${config.repo}/commit/${commitSha}`,
    };
  } catch (error) {
    if (error instanceof BranchMovedError) {
      return { ok: false, reason: "conflict", message: BRANCH_MOVED };
    }

    // The editor shows one plain line; the reason (bad token, protected branch) only
    // exists in the server log.
    console.error("admin: save failed", error);

    return {
      ok: false,
      reason: "error",
      message:
        "GitHub rejected the commit. Check the server logs and try again.",
    };
  }
}

export type UploadResult =
  | { ok: true; media: PendingMedia; width?: number; height?: number }
  | { ok: false; error: string };

function dimension(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) {
    return null;
  }

  const number = Number(value);

  return number >= 1 && number <= 10000 ? number : null;
}

// The upload becomes a loose blob on GitHub and nothing else: it joins the repository
// only when a publish references it, so abandoned uploads never touch the branch.
export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const config = readAdminConfig();

  if (!config) {
    return { ok: false, error: "The editor is not configured." };
  }

  if (
    !isSessionValid(cookies().get(SESSION_COOKIE)?.value, config.sessionSecret)
  ) {
    return {
      ok: false,
      error:
        "You are signed out. Your draft is kept in this browser; sign in to restore it.",
    };
  }

  const kind = formData.get("kind");
  const file = formData.get("file");

  if (kind !== "image" && kind !== "resume") {
    return { ok: false, error: "Unknown upload type." };
  }

  if (!(file instanceof File)) {
    return { ok: false, error: "No file was received." };
  }

  const width = kind === "image" ? dimension(formData.get("width")) : null;
  const height = kind === "image" ? dimension(formData.get("height")) : null;

  if (kind === "image" && (width === null || height === null)) {
    return { ok: false, error: "The image size is missing or out of range." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "The file is over 4 MB." };
  }

  // The draft's CV path, not the deployed one, so checkDraft and this action agree.
  const resumePath = pdfPath.safeParse(formData.get("resumePath"));

  if (
    kind === "resume" &&
    (!resumePath.success ||
      resumePath.data.split("/").some((part) => part === ".." || part === "."))
  ) {
    return { ok: false, error: "The CV path is missing or invalid." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkUpload({ kind, type: file.type, bytes });

  if (!checked.ok) {
    return { ok: false, error: checked.error };
  }

  const paths =
    kind === "image"
      ? mediaPaths({ kind, fileName: file.name, bytes, now: new Date() })
      : mediaPaths({
          kind,
          resumePath: resumePath.success ? resumePath.data : "",
        });

  try {
    const sha = await createBlob(config, Buffer.from(bytes).toString("base64"));

    return {
      ok: true,
      media: { kind, ...paths, sha },
      ...(width !== null && height !== null ? { width, height } : {}),
    };
  } catch (error) {
    console.error("admin: upload failed", error);

    return {
      ok: false,
      error: "GitHub rejected the upload. Check the server logs and try again.",
    };
  }
}

const MAX_ICON_QUERY = 40;
const MAX_ICON_RESULTS = 24;

// Logo search for the skill editor. Like every action it checks the session itself; an
// answer of "no results" (never an error) keeps the picker simple when signed out.
export async function searchIcons(query: string): Promise<IconResult[]> {
  const config = readAdminConfig();

  if (
    !config ||
    !isSessionValid(cookies().get(SESSION_COOKIE)?.value, config.sessionSecret)
  ) {
    return [];
  }

  const trimmed = typeof query === "string" ? query.trim() : "";

  if (!trimmed || trimmed.length > MAX_ICON_QUERY) {
    return [];
  }

  return searchBrandIcons(trimmed, MAX_ICON_RESULTS);
}

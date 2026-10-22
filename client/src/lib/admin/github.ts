import type { Locale } from "@/i18n/locale";
import type { MessageDomain } from "@/i18n/messages";
import type { MessageCatalogs, MessageNode } from "@/lib/content/catalog";
import type { ContentFiles } from "@/lib/content/schema";

import type { AdminConfig } from "./config";
import {
  CONTENT_FILES,
  contentFilePath,
  MESSAGE_DOMAINS,
  MESSAGE_LOCALES,
  type ContentDraft,
} from "./draft";

// The paths the editor may touch are fixed here rather than derived from the request,
// so no payload can steer a commit at another file in the repo.
export function messagePath(locale: Locale, domain: MessageDomain): string {
  return `client/messages/${locale}/${domain}.json`;
}

const PUBLIC_ROOT = "client/public";

// The branch head is not the one the editor loaded. The draft is kept and the editor
// offers a reload; nothing was written.
export class BranchMovedError extends Error {
  constructor() {
    super("The branch moved after the editor loaded.");
    this.name = "BranchMovedError";
  }
}

class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

async function callGitHub<T>(
  config: AdminConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${config.repo}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${config.githubToken}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    // The body carries GitHub's actual reason (bad token, protected branch, missing
    // scope); without it every failure looks the same in the Vercel logs.
    throw new GitHubError(
      `GitHub ${init?.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

async function headSha(config: AdminConfig): Promise<string> {
  const ref = await callGitHub<{ object: { sha: string } }>(
    config,
    `/git/ref/heads/${config.branch}`,
  );

  return ref.object.sha;
}

async function readJson<T>(config: AdminConfig, path: string, sha: string): Promise<T> {
  const file = await callGitHub<{ content: string; encoding: string }>(
    config,
    `/contents/${path}?ref=${sha}`,
  );

  return JSON.parse(Buffer.from(file.content, file.encoding as BufferEncoding).toString("utf8")) as T;
}

// The editor loads from GitHub rather than from the bundled imports: the bundle is
// whatever the last build contained, so between a save and the rebuild finishing it
// would show stale content and quietly overwrite the newer commit. The head is read
// once and every file is read at that commit, so the nine files cannot come from two
// different moments; `baseSha` is what a later commit is guarded against.
export async function readDraft(
  config: AdminConfig,
): Promise<{ draft: ContentDraft; baseSha: string; publicFiles: string[] }> {
  const baseSha = await headSha(config);

  const [tree, content, messages] = await Promise.all([
    callGitHub<{ truncated?: boolean; tree: { path: string; type: string }[] }>(
      config,
      `/git/trees/${baseSha}?recursive=1`,
    ),
    Promise.all(
      CONTENT_FILES.map(async (file) => [file, await readJson(config, contentFilePath(file), baseSha)] as const),
    ),
    Promise.all(
      MESSAGE_LOCALES.flatMap((locale) =>
        MESSAGE_DOMAINS.map(
          async (domain) =>
            [locale, domain, await readJson<MessageNode>(config, messagePath(locale, domain), baseSha)] as const,
        ),
      ),
    ),
  ]);

  // A truncated listing would make existing images look missing and block every save.
  if (tree.truncated) {
    throw new Error("GitHub truncated the repository tree, so the public files cannot be listed.");
  }

  const catalogs = { en: {}, id: {} } as MessageCatalogs;

  for (const [locale, domain, node] of messages) {
    catalogs[locale][domain] = node;
  }

  return {
    draft: {
      content: Object.fromEntries(content) as unknown as ContentFiles,
      messages: catalogs,
      media: [],
    },
    baseSha,
    publicFiles: tree.tree
      .filter((entry) => entry.type === "blob" && entry.path.startsWith(`${PUBLIC_ROOT}/`))
      .map((entry) => entry.path.slice(PUBLIC_ROOT.length)),
  };
}

// Uploads go up as blobs as soon as they are chosen, so the final commit only has to
// reference them and a save never carries megabytes through a server action.
export async function createBlob(config: AdminConfig, base64: string): Promise<string> {
  const blob = await callGitHub<{ sha: string }>(config, "/git/blobs", {
    method: "POST",
    body: JSON.stringify({ content: base64, encoding: "base64" }),
  });

  return blob.sha;
}

// One commit for every changed file. Separate Contents API writes would mean a commit
// and a Vercel build per file for a single save.
export async function commitDraft(
  config: AdminConfig,
  input: {
    baseSha: string;
    files: { path: string; content: string }[];
    blobs: { path: string; sha: string }[];
    message: string;
  },
): Promise<string> {
  const head = await headSha(config);

  // A code push since the editor loaded: the draft is built on an older tree.
  if (head !== input.baseSha) {
    throw new BranchMovedError();
  }

  const baseCommit = await callGitHub<{ tree: { sha: string } }>(config, `/git/commits/${head}`);

  const tree = await callGitHub<{ sha: string }>(config, "/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: [
        ...input.files.map((file) => ({
          path: file.path,
          mode: "100644",
          type: "blob",
          content: file.content,
        })),
        ...input.blobs.map((blob) => ({
          path: blob.path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        })),
      ],
    }),
  });

  const commit = await callGitHub<{ sha: string }>(config, "/git/commits", {
    method: "POST",
    body: JSON.stringify({ message: input.message, tree: tree.sha, parents: [head] }),
  });

  // Not forced: if something moved the branch between the check above and now, GitHub
  // answers 422 and the other commit survives.
  try {
    await callGitHub(config, `/git/refs/heads/${config.branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } catch (error) {
    if (error instanceof GitHubError && error.status === 422) {
      throw new BranchMovedError();
    }

    throw error;
  }

  return commit.sha;
}

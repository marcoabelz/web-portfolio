import type { Locale } from "@/i18n/locale";
import type { MessageDomain } from "@/i18n/messages";

import type { AdminConfig } from "./config";
import {
  MESSAGE_DOMAINS,
  MESSAGE_LOCALES,
  serializeMessages,
  type MessageDraft,
  type MessageNode,
} from "./draft";

// The six paths the CMS may touch are fixed here rather than derived from the
// request, so no payload can steer a commit at another file in the repo.
export function messagePath(locale: Locale, domain: MessageDomain): string {
  return `client/messages/${locale}/${domain}.json`;
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
    throw new Error(`GitHub ${init?.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

// The editor loads from GitHub rather than from the bundled imports: the bundle is
// whatever the last build contained, so between a save and the rebuild finishing it
// would show stale copy and quietly overwrite the newer commit.
export async function readDraft(config: AdminConfig): Promise<MessageDraft> {
  const files = MESSAGE_LOCALES.flatMap((locale) =>
    MESSAGE_DOMAINS.map(async (domain) => {
      const file = await callGitHub<{ content: string; encoding: string }>(
        config,
        `/contents/${messagePath(locale, domain)}?ref=${encodeURIComponent(config.branch)}`,
      );

      return {
        locale,
        domain,
        node: JSON.parse(
          Buffer.from(file.content, file.encoding as BufferEncoding).toString("utf8"),
        ) as MessageNode,
      };
    }),
  );

  const draft = { en: {}, id: {} } as MessageDraft;

  for (const { locale, domain, node } of await Promise.all(files)) {
    draft[locale][domain] = node;
  }

  return draft;
}

// One commit for all six files. Six separate Contents API writes would mean six
// commits and six Vercel builds for a single save.
export async function commitDraft(
  config: AdminConfig,
  draft: MessageDraft,
  message: string,
): Promise<string> {
  const branch = `heads/${config.branch}`;
  const ref = await callGitHub<{ object: { sha: string } }>(config, `/git/ref/${branch}`);
  const baseCommit = await callGitHub<{ tree: { sha: string } }>(
    config,
    `/git/commits/${ref.object.sha}`,
  );

  const tree = await callGitHub<{ sha: string }>(config, "/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: MESSAGE_LOCALES.flatMap((locale) =>
        MESSAGE_DOMAINS.map((domain) => ({
          path: messagePath(locale, domain),
          mode: "100644",
          type: "blob",
          content: serializeMessages(draft[locale][domain]),
        })),
      ),
    }),
  });

  const commit = await callGitHub<{ sha: string }>(config, "/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  });

  // Not forced: if something else moved the branch since the read, this fails and the
  // editor reloads rather than throwing away the other commit.
  await callGitHub(config, `/git/refs/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return commit.sha;
}

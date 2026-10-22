import { vi } from "vitest";

import { getAllMessages } from "@/i18n/messages";
import { contentFilePath, CONTENT_FILES, referencedMedia, serializeJson } from "@/lib/admin/draft";
import { messagePath } from "@/lib/admin/github";
import { getContentFiles } from "@/lib/content/load";

export type StubOptions = {
  head: string;
  // Public URLs that exist on the branch; defaults to everything the content references.
  publicFiles?: string[];
  files?: Record<string, string>;
  // Make the non-forced ref update answer 422, the way GitHub does when the branch moved.
  refUpdateStatus?: number;
  truncatedTree?: boolean;
};

export type StubCalls = {
  requests: string[];
  tree?: { base_tree: string; tree: { path: string; content?: string; sha?: string }[] };
  commit?: { message: string; tree: string; parents: string[] };
  refUpdate?: { sha: string; force: boolean };
  blob?: { content: string; encoding: string };
};

// The repository's own files, serialized the way the editor writes them.
export function repositoryFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  const content = getContentFiles();

  for (const file of CONTENT_FILES) {
    files[contentFilePath(file)] = serializeJson(content[file]);
  }

  const messages = getAllMessages();

  for (const locale of ["en", "id"] as const) {
    for (const domain of ["common", "portfolio", "projects"] as const) {
      files[messagePath(locale, domain)] = serializeJson(messages[locale][domain]);
    }
  }

  return files;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Never reaches the real GitHub API: every route the editor uses is answered here.
export function stubGitHub(options: StubOptions): StubCalls {
  const calls: StubCalls = { requests: [] };
  const files = options.files ?? repositoryFiles();
  const publicFiles = options.publicFiles ?? referencedMedia(getContentFiles());

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      const path = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, "");
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;

      calls.requests.push(`${method} ${path}`);

      if (url.hostname !== "api.github.com") {
        throw new Error(`Unexpected host ${url.hostname}`);
      }

      if (method === "GET" && path.startsWith("/git/ref/heads/")) {
        return json({ object: { sha: options.head } });
      }

      if (method === "GET" && path.startsWith("/git/trees/")) {
        return json({
          sha: "tree",
          truncated: options.truncatedTree ?? false,
          tree: [
            { path: "client/package.json", type: "blob" },
            { path: "client/public", type: "tree" },
            ...publicFiles.map((file) => ({ path: `client/public${file}`, type: "blob" })),
          ],
        });
      }

      if (method === "GET" && path.startsWith("/contents/")) {
        const file = decodeURIComponent(path.slice("/contents/".length));

        if (!(file in files)) {
          return json({ message: "Not Found" }, 404);
        }

        return json({
          content: Buffer.from(files[file], "utf8").toString("base64"),
          encoding: "base64",
          ref: url.searchParams.get("ref"),
        });
      }

      if (method === "GET" && path.startsWith("/git/commits/")) {
        return json({ tree: { sha: "basetree" } });
      }

      if (method === "POST" && path === "/git/blobs") {
        calls.blob = body;
        return json({ sha: "blobsha" });
      }

      if (method === "POST" && path === "/git/trees") {
        calls.tree = body;
        return json({ sha: "newtree" });
      }

      if (method === "POST" && path === "/git/commits") {
        calls.commit = body;
        return json({ sha: "newcommit" });
      }

      if (method === "PATCH" && path.startsWith("/git/refs/heads/")) {
        calls.refUpdate = body;

        return options.refUpdateStatus
          ? json({ message: "Update is not a fast forward" }, options.refUpdateStatus)
          : json({});
      }

      throw new Error(`Unstubbed GitHub call: ${method} ${path}`);
    }),
  );

  return calls;
}

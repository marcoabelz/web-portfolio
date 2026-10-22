import { afterEach, describe, expect, it, vi } from "vitest";

import { getAllMessages } from "@/i18n/messages";
import { getContentFiles } from "@/lib/content/load";
import { readAdminConfig, type AdminConfig } from "./config";
import { BranchMovedError, commitDraft, createBlob, readDraft } from "./github";
import { stubGitHub } from "@/test/github-stub";

const config = readAdminConfig({
  ADMIN_EMAIL: "editor@example.com",
  ADMIN_PASSWORD: "pw",
  ADMIN_SESSION_SECRET: "secret",
  GITHUB_TOKEN: "token",
  GITHUB_REPO: "owner/repo",
  GITHUB_BRANCH: "main",
}) as AdminConfig;

afterEach(() => vi.unstubAllGlobals());

describe("readDraft", () => {
  it("reads the head once and every file at that commit", async () => {
    const calls = stubGitHub({ head: "headsha" });
    const result = await readDraft(config);

    expect(result.baseSha).toBe("headsha");
    expect(result.draft.media).toEqual([]);
    expect(result.draft.content).toEqual(JSON.parse(JSON.stringify(getContentFiles())));
    expect(result.draft.messages).toEqual(getAllMessages());
    expect(calls.requests.filter((request) => request.includes("/git/ref/"))).toHaveLength(1);
    expect(calls.requests.filter((request) => request.startsWith("GET /contents/"))).toHaveLength(9);
  });

  it("lists the public URL of every blob under client/public", async () => {
    stubGitHub({ head: "headsha", publicFiles: ["/cv.pdf", "/media/a.webp"] });

    expect((await readDraft(config)).publicFiles.sort()).toEqual(["/cv.pdf", "/media/a.webp"]);
  });

  it("fails loudly when GitHub truncates the tree", async () => {
    stubGitHub({ head: "headsha", truncatedTree: true });

    await expect(readDraft(config)).rejects.toThrow(/truncated/i);
  });
});

describe("createBlob", () => {
  it("uploads base64 and returns the blob sha", async () => {
    const calls = stubGitHub({ head: "headsha" });

    await expect(createBlob(config, "QUJD")).resolves.toBe("blobsha");
    expect(calls.blob).toEqual({ content: "QUJD", encoding: "base64" });
  });
});

describe("commitDraft", () => {
  it("refuses to commit when the branch moved", async () => {
    const calls = stubGitHub({ head: "new-sha" });

    await expect(
      commitDraft(config, { baseSha: "old-sha", files: [], blobs: [], message: "m" }),
    ).rejects.toBeInstanceOf(BranchMovedError);
    expect(calls.commit).toBeUndefined();
    expect(calls.refUpdate).toBeUndefined();
  });

  it("commits text files and uploaded blobs in one tree", async () => {
    const calls = stubGitHub({ head: "base" });

    const sha = await commitDraft(config, {
      baseSha: "base",
      files: [{ path: "client/content/site.json", content: "{}\n" }],
      blobs: [{ path: "client/public/media/2026/a-1234abcd.webp", sha: "blobsha" }],
      message: "m",
    });

    expect(sha).toBe("newcommit");
    expect(calls.tree?.tree).toEqual([
      expect.objectContaining({ path: "client/content/site.json", content: "{}\n" }),
      expect.objectContaining({ path: "client/public/media/2026/a-1234abcd.webp", sha: "blobsha" }),
    ]);
    expect(calls.tree?.base_tree).toBe("basetree");
    expect(calls.commit).toMatchObject({ message: "m", tree: "newtree", parents: ["base"] });
    expect(calls.refUpdate).toEqual({ sha: "newcommit", force: false });
  });

  it("treats a rejected ref update as a moved branch", async () => {
    stubGitHub({ head: "base", refUpdateStatus: 422 });

    await expect(
      commitDraft(config, { baseSha: "base", files: [], blobs: [], message: "m" }),
    ).rejects.toBeInstanceOf(BranchMovedError);
  });

  it("surfaces other GitHub failures as plain errors", async () => {
    stubGitHub({ head: "base", refUpdateStatus: 500 });

    const failure = await commitDraft(config, { baseSha: "base", files: [], blobs: [], message: "m" }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBeInstanceOf(BranchMovedError);
  });
});

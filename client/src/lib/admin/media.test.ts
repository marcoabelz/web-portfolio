import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => (cookieJar.value === undefined ? undefined : { value: cookieJar.value }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import { uploadMedia } from "@/app/admin/actions";
import { stubGitHub } from "@/test/github-stub";

import { checkUpload, MAX_UPLOAD_BYTES, mediaPaths } from "./media";
import { createSessionToken } from "./session";

function webpBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  return bytes;
}

function pngBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return bytes;
}

function jpegBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
  return bytes;
}

function pdfBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode("%PDF-1.7"), 0);
  return bytes;
}

describe("checkUpload", () => {
  it.each([
    ["webp image", { kind: "image", type: "image/webp", bytes: webpBytes() }, true],
    ["png sent straight to the server", { kind: "image", type: "image/png", bytes: pngBytes() }, false],
    ["svg is never accepted", { kind: "image", type: "image/svg+xml", bytes: new TextEncoder().encode("<svg/>") }, false],
    ["jpeg image", { kind: "image", type: "image/jpeg", bytes: jpegBytes() }, true],
    ["jpeg label on png bytes", { kind: "image", type: "image/jpeg", bytes: pngBytes() }, false],
    ["jpeg bytes labelled png", { kind: "image", type: "image/png", bytes: jpegBytes() }, false],
    ["jpeg as the cv", { kind: "resume", type: "image/jpeg", bytes: jpegBytes() }, false],
    ["webp label on png bytes", { kind: "image", type: "image/webp", bytes: pngBytes() }, false],
    ["pdf as an image", { kind: "image", type: "application/pdf", bytes: pdfBytes() }, false],
    ["pdf cv", { kind: "resume", type: "application/pdf", bytes: pdfBytes() }, true],
    ["webp as the cv", { kind: "resume", type: "image/webp", bytes: webpBytes() }, false],
    ["pdf label on webp bytes", { kind: "resume", type: "application/pdf", bytes: webpBytes() }, false],
    ["oversized cv", { kind: "resume", type: "application/pdf", bytes: pdfBytes(MAX_UPLOAD_BYTES + 1) }, false],
    ["oversized image", { kind: "image", type: "image/webp", bytes: webpBytes(MAX_UPLOAD_BYTES + 1) }, false],
    ["empty file", { kind: "image", type: "image/webp", bytes: new Uint8Array(0) }, false],
  ] as const)("%s", (_name, input, ok) => {
    const result = checkUpload({ kind: input.kind, type: input.type, bytes: input.bytes });
    expect(result.ok).toBe(ok);
    if (!result.ok) {
      expect(result.error).not.toBe("");
    }
  });
});

describe("mediaPaths", () => {
  it("names images by year, slug, and content hash", () => {
    expect(
      mediaPaths({ kind: "image", fileName: "My Portrait.JPG", bytes: webpBytes(), now: new Date("2026-10-21") }),
    ).toEqual({
      repoPath: expect.stringMatching(/^client\/public\/media\/2026\/my-portrait-[0-9a-f]{8}\.webp$/),
      publicPath: expect.stringMatching(/^\/media\/2026\/my-portrait-[0-9a-f]{8}\.webp$/),
    });
  });

  it("stores a JPEG fallback as .jpg", () => {
    const paths = mediaPaths({ kind: "image", fileName: "IMG 1.heic", bytes: jpegBytes(), now: new Date("2026-10-21") });
    expect(paths.repoPath).toMatch(/^client\/public\/media\/2026\/img-1-[0-9a-f]{8}\.jpg$/);
    expect(paths.publicPath).toMatch(/^\/media\/2026\/img-1-[0-9a-f]{8}\.jpg$/);
  });

  it("falls back to 'image' and differs by content", () => {
    const a = mediaPaths({ kind: "image", fileName: "日本.png", bytes: webpBytes(64), now: new Date("2026-01-01") });
    const b = mediaPaths({ kind: "image", fileName: "日本.png", bytes: webpBytes(65), now: new Date("2026-01-01") });
    expect(a.publicPath).toMatch(/^\/media\/2026\/image-/);
    expect(a.publicPath).not.toBe(b.publicPath);
  });

  it("keeps the CV at its public URL", () => {
    expect(
      mediaPaths({ kind: "resume", resumePath: "/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf" }).repoPath,
    ).toBe("client/public/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf");
  });
});

describe("uploadMedia", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    cookieJar.value = undefined;
  });

  function configure() {
    vi.stubEnv("ADMIN_EMAIL", "editor@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "pw");
    vi.stubEnv("ADMIN_SESSION_SECRET", "session-secret");
    vi.stubEnv("GITHUB_TOKEN", "t");
    vi.stubEnv("GITHUB_REPO", "owner/repo");
  }

  function signIn() {
    cookieJar.value = createSessionToken("session-secret", Date.now() + 60_000);
  }

  function form(fields: Record<string, string>, file?: File): FormData {
    const data = new FormData();
    Object.entries(fields).forEach(([key, value]) => data.set(key, value));
    if (file) data.set("file", file);
    return data;
  }

  const webp = () => new File([webpBytes()], "Shot.webp", { type: "image/webp" });

  it("requires a session before reading the form", async () => {
    configure();
    const calls = stubGitHub({ head: "h" });
    await expect(uploadMedia(form({ kind: "image" }))).resolves.toMatchObject({ ok: false });
    expect(calls.requests).toEqual([]);
  });

  it("creates a blob and returns the pending media", async () => {
    configure();
    signIn();
    const calls = stubGitHub({ head: "h" });
    const result = await uploadMedia(form({ kind: "image", width: "800", height: "600" }, webp()));
    expect(result).toMatchObject({ ok: true, width: 800, height: 600 });
    if (result.ok) {
      expect(result.media).toMatchObject({ kind: "image", sha: "blobsha" });
      expect(result.media.repoPath).toMatch(/^client\/public\/media\/\d{4}\/shot-[0-9a-f]{8}\.webp$/);
    }
    expect(calls.requests).toEqual(["POST /git/blobs"]);
    expect(calls.blob?.encoding).toBe("base64");
  });

  it("stores the CV at the path in site.json", async () => {
    configure();
    signIn();
    stubGitHub({ head: "h" });
    const file = new File([pdfBytes()], "cv.pdf", { type: "application/pdf" });
    const result = await uploadMedia(form({ kind: "resume", resumePath: "/My_CV.pdf" }, file));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.media).toMatchObject({ kind: "resume", repoPath: "client/public/My_CV.pdf", publicPath: "/My_CV.pdf" });
    }
  });

  it.each(["", "/cv.png", "/../x.pdf", "cv.pdf"])("rejects CV path %j", async (resumePath) => {
    configure();
    signIn();
    const calls = stubGitHub({ head: "h" });
    const file = new File([pdfBytes()], "cv.pdf", { type: "application/pdf" });
    await expect(uploadMedia(form({ kind: "resume", resumePath }, file))).resolves.toMatchObject({ ok: false });
    expect(calls.requests).toEqual([]);
  });

  it("accepts a JPEG image", async () => {
    configure();
    signIn();
    stubGitHub({ head: "h" });
    const file = new File([jpegBytes()], "Phone.jpg", { type: "image/jpeg" });
    const result = await uploadMedia(form({ kind: "image", width: "10", height: "10" }, file));
    expect(result.ok && result.media.repoPath).toMatch(/phone-[0-9a-f]{8}\.jpg$/);
  });

  it.each([
    ["bad kind", { kind: "video" }, webp()],
    ["missing file", { kind: "image", width: "10", height: "10" }, undefined],
    ["missing dimensions", { kind: "image" }, webp()],
    ["fractional width", { kind: "image", width: "1.5", height: "10" }, webp()],
    ["huge width", { kind: "image", width: "10001", height: "10" }, webp()],
    ["zero height", { kind: "image", width: "10", height: "0" }, webp()],
    ["png bytes", { kind: "image", width: "10", height: "10" }, new File([pngBytes()], "a.webp", { type: "image/webp" })],
  ])("rejects %s without calling GitHub", async (_name, fields, file) => {
    configure();
    signIn();
    const calls = stubGitHub({ head: "h" });
    await expect(uploadMedia(form(fields, file))).resolves.toMatchObject({ ok: false });
    expect(calls.requests).toEqual([]);
  });
});

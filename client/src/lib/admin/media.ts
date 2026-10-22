import { createHash } from "node:crypto";

import { slugify } from "./operations";
import { MAX_UPLOAD_BYTES } from "./upload-limits";

export { MAX_UPLOAD_BYTES };

// One Simple Icons match sent to the editor. Type-only on purpose: this module imports
// node:crypto, so client code must `import type` it.
export type IconResult = { slug: string; title: string; path: string };

export type UploadKind = "image" | "resume";

type Check = { ok: true } | { ok: false; error: string };

function startsWith(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) {
    return false;
  }

  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) {
      return false;
    }
  }

  return true;
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

// The declared MIME type is only a label the browser (or an attacker) chose, so the
// bytes are checked too. SVG is never accepted: served from this origin it can run script.
export function checkUpload(input: { kind: UploadKind; type: string; bytes: Uint8Array }): Check {
  if (input.bytes.length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  if (input.bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "The file is over 4 MB." };
  }

  if (input.kind === "image") {
    // JPEG is the fallback for browsers that cannot encode WebP (Safari, iOS). The
    // canvas always re-encodes, so PNG and AVIF never pass through.
    const webp =
      input.type === "image/webp" && startsWith(input.bytes, 0, "RIFF") && startsWith(input.bytes, 8, "WEBP");
    const jpeg = input.type === "image/jpeg" && isJpeg(input.bytes);

    if (!webp && !jpeg) {
      return { ok: false, error: "Only WebP or JPEG images are accepted." };
    }

    return { ok: true };
  }

  if (input.type !== "application/pdf" || !startsWith(input.bytes, 0, "%PDF-")) {
    return { ok: false, error: "The CV must be a PDF." };
  }

  return { ok: true };
}

export function mediaPaths(
  input:
    | { kind: "image"; fileName: string; bytes: Uint8Array; now: Date }
    | { kind: "resume"; resumePath: string },
): { repoPath: string; publicPath: string } {
  if (input.kind === "resume") {
    return { repoPath: `client/public${input.resumePath}`, publicPath: input.resumePath };
  }

  const base = input.fileName.replace(/\.[^./\\]*$/, "");
  const slug = slugify(base) || "image";
  const hash = createHash("sha256").update(input.bytes).digest("hex").slice(0, 8);
  const publicPath = `/media/${input.now.getUTCFullYear()}/${slug}-${hash}.${isJpeg(input.bytes) ? "jpg" : "webp"}`;

  return { repoPath: `client/public${publicPath}`, publicPath };
}

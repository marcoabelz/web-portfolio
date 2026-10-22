import { MAX_UPLOAD_BYTES } from "@/lib/admin/upload-limits";

// Browser only. Photos from a phone are far over the 4 MB upload limit, so they are
// decoded, shrunk, and re-encoded as WebP here; the server only ever sees the result.

export const MAX_EDGE = 2400;
export const QUALITY = 0.86;

export class UnsupportedImageError extends Error {
  constructor(
    message = "This format isn't supported. Export the photo as JPEG or PNG first.",
  ) {
    super(message);
    this.name = "UnsupportedImageError";
  }
}

// Scales the long edge down to maxEdge, keeping the ratio. Never upscales.
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);

  if (longEdge <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  type: "image/webp" | "image/jpeg",
): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(bitmap, 0, 0, width, height);

    return canvas.convertToBlob({ type, quality: QUALITY });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function prepareImage(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UnsupportedImageError();
  }

  try {
    const size = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);
    let blob = await encode(bitmap, size.width, size.height, "image/webp");

    // WebKit (Safari, every iOS browser) cannot encode WebP and silently hands back a
    // PNG. JPEG is the fallback; the server accepts it, and WebP stays preferred.
    if (!blob || blob.type !== "image/webp") {
      blob = await encode(bitmap, size.width, size.height, "image/jpeg");
    }

    if (!blob || (blob.type !== "image/jpeg" && blob.type !== "image/webp")) {
      throw new UnsupportedImageError(
        "This browser can't convert images. Try another browser.",
      );
    }

    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        "The image is still over 4 MB after compression. Try a smaller photo.",
      );
    }

    return { blob, ...size };
  } finally {
    bitmap.close();
  }
}

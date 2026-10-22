import type { MessageCatalogs } from "./catalog";
import type { ContentFiles } from "./schema";
import type { ContentIssue } from "./validate";

// Client companies and brands behind the private apps. None of them may appear in the
// site's facts, copy, or published file names. The repository is public, so the list holds
// no names: each entry is the SHA-256 (hex) of the normalised name plus that name's length,
// and the matcher hashes every substring of that length. Hashes of short names are easy to
// guess, so this only keeps the names out of plain text; it is not a secret.
//
// To add a name, print its entry from client/ and paste it below (the name stays on your
// machine and in your shell history only):
//   node --input-type=module -e 'const m = await import("./src/lib/content/client-names.ts"); console.log(m.clientNameHash(process.argv[1]))' "<name>"
//
// Not listed on purpose: Pawlo (its client agreed to be named; the app is public), the
// brand inside E-Passport's approved event URL, Abel's own employers (his Experience
// entries name them), and "sawit", the plain Indonesian word for palm oil.
// `roll` is a 32-bit rolling hash of the same text. It lets the matcher skip almost every
// substring cheaply and run SHA-256 only on the few whose rolling hash matches.
export type ClientNameHash = { readonly length: number; readonly roll: number; readonly sha256: string };

export const CLIENT_NAME_HASHES: readonly ClientNameHash[] = [
  { length: 6, roll: 3931158765, sha256: "02fb6cc8787172136763c92ef99250a5b39657abe7805115ad49928472525a80" },
  { length: 5, roll: 1166625898, sha256: "5457e4eee507fe5fd1aee7582e90e5142b92613aef0a1d239e358246c5bd8e2d" },
  { length: 9, roll: 3644176695, sha256: "66f5b9110b1d959c681e25c572e04a6432d6c35fbf61fa058081d23fcba7c151" },
  { length: 6, roll: 3509599411, sha256: "7c2ec214fca7bc1573f330c541bc87a365e9b31cb788216479db999c9366b745" },
  { length: 6, roll: 3540738478, sha256: "209cf6b30b406bd8706b507b9b918084e999ab563f11123f1336507e0546bdf8" },
  { length: 8, roll: 4044831023, sha256: "6350c0c0359cbd009ac234749ad6c07ead6263542dfed275657ceeaa4447418c" },
  { length: 9, roll: 3798981765, sha256: "6b4bf09c7f4f45cffc3e42c80725874cedc3c911e14aa073ed71c311a362e7a4" },
  { length: 12, roll: 4148411645, sha256: "a32bb1c9866f889ff80d239325d819550943e0168bad24e0f346e154719fc9a5" },
];

// Hyphens, underscores, and dots count as spaces, so a file name like "acme-rival.webp"
// matches "Acme Rival"; a phrase still has to appear whole ("acme" alone never matches).
export const normaliseClientText = (text: string) => text.toLowerCase().replace(/[\s._-]+/g, " ");

// SHA-256 in plain TypeScript, because the check also runs in the /admin editor in the
// browser (review.ts calls checkDraft) and must stay synchronous; node:crypto would not
// bundle there and Web Crypto is async. client-names.test.ts pins it to node:crypto.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const encoder = new TextEncoder();
const W = new Uint32Array(64);

export function sha256Hex(text: string): string {
  const bytes = encoder.encode(text);
  const padded = new Uint8Array((((bytes.length + 9 + 63) >> 6) << 6));
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(padded.length - 4, bits >>> 0);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((word) => word.toString(16).padStart(8, "0")).join("");
}

const BASE = 0x01000193;

// Polynomial hash of text[start, start + length) over UTF-16 code units, mod 2^32.
function rollOf(text: string, start = 0, length = text.length): number {
  let hash = 0;
  for (let i = start; i < start + length; i++) hash = (Math.imul(hash, BASE) + text.charCodeAt(i)) >>> 0;
  return hash;
}

// The list entry for a name, for tests and for adding a name.
export function clientNameHash(name: string): ClientNameHash {
  const normalised = normaliseClientText(name).trim();
  return { length: normalised.length, roll: rollOf(normalised), sha256: sha256Hex(normalised) };
}

// The hashes of the listed names found in the text (each once), in list order. Empty when
// none appears. A rolling hash screens every substring as long as a listed name; only a
// rolling-hash hit is checked with SHA-256, so the result matches the plain-text check.
export function clientNamesIn(text: string, list: readonly ClientNameHash[] = CLIENT_NAME_HASHES): string[] {
  if (list.length === 0) return [];
  const haystack = normaliseClientText(text);
  const shortest = Math.min(...list.map((entry) => entry.length));
  if (haystack.length < shortest) return [];

  const wanted = new Set(list.map((entry) => entry.sha256));
  const found = new Set<string>();
  for (const length of Array.from(new Set(list.map((entry) => entry.length)))) {
    if (haystack.length < length) continue;
    const rolls = new Set(list.filter((entry) => entry.length === length).map((entry) => entry.roll));
    // BASE^(length - 1), to drop the leading code unit while the window slides.
    let lead = 1;
    for (let i = 1; i < length; i++) lead = Math.imul(lead, BASE) >>> 0;
    let roll = rollOf(haystack, 0, length);
    for (let start = 0; ; start++) {
      if (rolls.has(roll)) {
        const hash = sha256Hex(haystack.slice(start, start + length));
        if (wanted.has(hash)) found.add(hash);
      }
      if (start + length >= haystack.length) break;
      roll = (roll - Math.imul(haystack.charCodeAt(start), lead)) >>> 0;
      roll = (Math.imul(roll, BASE) + haystack.charCodeAt(start + length)) >>> 0;
    }
  }
  return list.map((entry) => entry.sha256).filter((hash, index, all) => found.has(hash) && all.indexOf(hash) === index);
}

// The message cannot say which name matched: the list only knows hashes.
const message = () => "Names a client; the site never names a client.";

// Every string in a JSON value with its path, written like the other content issues.
function stringsIn(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  if (Array.isArray(node)) return node.flatMap((entry, index) => stringsIn(entry, `${prefix}[${index}]`));
  if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, value]) => stringsIn(value, prefix ? `${prefix}.${key}` : key));
  }
  return [];
}

export function checkClientNames(
  content: ContentFiles,
  catalogs: MessageCatalogs,
  list: readonly ClientNameHash[] = CLIENT_NAME_HASHES,
): ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const file of ["site", "portfolio", "projects"] as const) {
    for (const [path, text] of stringsIn(content[file])) {
      const names = clientNamesIn(text, list);
      if (names.length > 0) issues.push({ file, path, message: message() });
    }
  }

  for (const [path, text] of stringsIn(catalogs)) {
    const names = clientNamesIn(text, list);
    if (names.length > 0) issues.push({ file: "messages", path, message: message() });
  }

  return issues;
}

export function checkClientNamesInPaths(
  paths: readonly string[],
  list: readonly ClientNameHash[] = CLIENT_NAME_HASHES,
): ContentIssue[] {
  return paths.flatMap((path) => {
    const names = clientNamesIn(path, list);
    return names.length > 0 ? [{ file: "media" as const, path, message: message() }] : [];
  });
}

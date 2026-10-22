import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { getContentFiles } from "./load";
import { CLIENT_NAME_HASHES, clientNameHash, clientNamesIn, normaliseClientText, sha256Hex } from "./client-names";

// The rule itself lives in ./client-names, where the build and the editor's checkDraft
// enforce it. This guard also covers what neither sees: every file name under public/work.
const CLIENT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function hits(entries: readonly { label: string; text: string }[]): string[] {
  return entries.flatMap(({ label, text }) => clientNamesIn(text).map((name) => `${label}: ${name}`));
}

const relativeToClient = (path: string) => relative(CLIENT_ROOT, path);

describe("client names", () => {
  const acme = clientNameHash("Acme Rival Foods");
  const list = [acme];

  it("hashes the same way as node:crypto", () => {
    for (const text of ["", "acme rival foods", "a".repeat(200), "Ünïcode ✓"]) {
      expect(sha256Hex(text)).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
    }
  });

  it("are caught in any letter case and across separators, as whole phrases", () => {
    expect(clientNamesIn("a calculator by ACME RIVAL FOODS", list)).toEqual([acme.sha256]);
    expect(clientNamesIn("/media/2026/acme-rival_foods.webp", list)).toEqual([acme.sha256]);
    expect(clientNamesIn("acme and rival foods", list)).toEqual([]);
    expect(clientNamesIn("short", list)).toEqual([]);
    expect(clientNamesIn("acme rival foods", [])).toEqual([]);
  });

  it("finds exactly what a plain substring search finds", () => {
    const names = ["Acme Rival Foods", "Zeta", "Bolt-On Labs", "Q"];
    const many = names.map(clientNameHash);
    const texts = ["zeta acme rival foods", "bolt on labs/zetaq", "nothing here", "q", "ZETA ZETA", "acme rival food"];
    for (const text of texts) {
      const plain = normaliseClientText(text);
      const expected = names
        .filter((name) => plain.includes(normaliseClientText(name).trim()))
        .map((name) => clientNameHash(name).sha256);
      expect(clientNamesIn(text, many)).toEqual(expected);
    }
  });

  it("let the approved public names and links through on the real list", () => {
    expect(CLIENT_NAME_HASHES.length).toBeGreaterThan(0);
    expect(clientNamesIn("Pawlo pet microsite, https://hellopawlo.com")).toEqual([]);
    // Every live link the apps carry is approved, E-Passport's event page included.
    const liveUrls = getContentFiles().projects.selected.flatMap((app) => (app.liveUrl ? [app.liveUrl] : []));
    expect(liveUrls.length).toBeGreaterThan(0);
    for (const url of liveUrls) expect(clientNamesIn(url)).toEqual([]);
    expect(clientNamesIn("Pediatric nutrition calculator")).toEqual([]);
  });

  it("appear in no content or message file", () => {
    const files = [...filesUnder(join(CLIENT_ROOT, "content")), ...filesUnder(join(CLIENT_ROOT, "messages"))];

    expect(files.length).toBeGreaterThan(0);
    expect(
      hits(files.map((path) => ({ label: relativeToClient(path), text: readFileSync(path, "utf8") }))),
    ).toEqual([]);
  });

  it("appear in no published work image name", () => {
    const files = filesUnder(join(CLIENT_ROOT, "public", "work"));

    expect(files.length).toBeGreaterThan(0);
    expect(hits(files.map((path) => ({ label: relativeToClient(path), text: relativeToClient(path) })))).toEqual([]);
  });
});

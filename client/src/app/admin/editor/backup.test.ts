import { describe, expect, it } from "vitest";

import { repoDraft } from "@/lib/admin/test-draft";

import {
  BACKUP_KEY,
  EDITS_KEY,
  backupKey,
  clearAfterPublish,
  clearBackup,
  loadBackup,
  newerBackup,
  planRestore,
  saveBackup,
  type Backup,
} from "./backup";

function fakeStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const throwing = new Proxy({} as Storage, {
  get: () => () => {
    throw new Error("blocked");
  },
});

const backup = (): Backup => ({ draft: repoDraft(), baseSha: "abc", savedAt: "2026-10-21T10:00:00.000Z" });

describe("draft backup", () => {
  it("round-trips and clears", () => {
    const storage = fakeStorage();

    saveBackup(storage, backup());
    expect(loadBackup(storage)).toEqual(backup());

    clearBackup(storage);
    expect(loadBackup(storage)).toBeNull();
  });

  it("reads corrupt or foreign values as null", () => {
    const storage = fakeStorage();

    storage.setItem(BACKUP_KEY, "{not json");
    expect(loadBackup(storage)).toBeNull();

    storage.setItem(BACKUP_KEY, JSON.stringify({ hello: "world" }));
    expect(loadBackup(storage)).toBeNull();

    storage.setItem(BACKUP_KEY, "null");
    expect(loadBackup(storage)).toBeNull();
  });

  it("never throws when storage is missing or throws", () => {
    expect(() => saveBackup(throwing, backup())).not.toThrow();
    expect(() => clearBackup(throwing)).not.toThrow();
    expect(loadBackup(throwing)).toBeNull();
    expect(() => saveBackup(undefined, backup())).not.toThrow();
    expect(loadBackup(undefined)).toBeNull();
    expect(() => clearBackup(undefined)).not.toThrow();
  });
});

describe("edits made while the offer is open", () => {
  it("writes them under a second key, never over the offered draft", () => {
    expect(backupKey(true)).toBe(EDITS_KEY);
    expect(backupKey(false)).toBe(BACKUP_KEY);
    expect(EDITS_KEY).not.toBe(BACKUP_KEY);
  });

  it("keeps the two copies apart", () => {
    const storage = fakeStorage();
    const offered = { ...backup(), savedAt: "2026-10-21T10:00:00.000Z" };
    const edits = { ...backup(), savedAt: "2026-10-21T11:00:00.000Z" };

    saveBackup(storage, offered);
    saveBackup(storage, edits, backupKey(true));

    expect(loadBackup(storage)).toEqual(offered);
    expect(loadBackup(storage, EDITS_KEY)).toEqual(edits);

    clearBackup(storage, EDITS_KEY);

    expect(loadBackup(storage)).toEqual(offered);
    expect(loadBackup(storage, EDITS_KEY)).toBeNull();
  });

  it("offers the newer of two leftover copies", () => {
    const older = { ...backup(), savedAt: "2026-10-21T10:00:00.000Z" };
    const newer = { ...backup(), savedAt: "2026-10-21T11:00:00.000Z" };

    expect(newerBackup(older, newer)).toBe(newer);
    expect(newerBackup(newer, older)).toBe(newer);
    expect(newerBackup(null, older)).toBe(older);
    expect(newerBackup(null, null)).toBeNull();
  });
});

describe("what a backup may offer", () => {
  it("round-trips the base it was made on", () => {
    const storage = fakeStorage();
    const withBase = { ...backup(), base: repoDraft() };

    saveBackup(storage, withBase);
    expect(loadBackup(storage)).toEqual(withBase);
  });

  it("never offers content the site would reject", () => {
    const storage = fakeStorage();
    const broken = backup();
    (broken.draft.content.site.profile as Record<string, unknown>).name = 42;

    saveBackup(storage, broken);
    expect(loadBackup(storage)).toBeNull();
  });

  it("never offers messages missing a locale or a domain", () => {
    const storage = fakeStorage();
    const noLocale = backup();
    delete (noLocale.draft.messages as Partial<Backup["draft"]["messages"]>).id;
    saveBackup(storage, noLocale);
    expect(loadBackup(storage)).toBeNull();

    const noDomain = backup();
    delete (noDomain.draft.messages.en as Partial<Backup["draft"]["messages"]["en"]>).projects;
    saveBackup(storage, noDomain);
    expect(loadBackup(storage)).toBeNull();
  });

  it("drops a broken base and keeps the draft, which then restores as before", () => {
    const storage = fakeStorage();
    const base = repoDraft();
    (base.content as Record<string, unknown>).site = null;

    saveBackup(storage, { ...backup(), base });
    expect(loadBackup(storage)).toEqual(backup());
  });
});

describe("after a publish", () => {
  it("clears both copies so a later load cannot offer a snapshot that undoes it", () => {
    const storage = fakeStorage();

    saveBackup(storage, backup());
    saveBackup(storage, backup(), EDITS_KEY);
    clearAfterPublish(storage);

    expect(loadBackup(storage)).toBeNull();
    expect(loadBackup(storage, EDITS_KEY)).toBeNull();
    expect(() => clearAfterPublish(throwing)).not.toThrow();
  });
});

describe("planRestore", () => {
  it("restores the whole draft when the site has not moved", () => {
    const saved = backup();
    saved.draft.content.site.heroFacts.experience = "Local";

    expect(planRestore(saved, repoDraft(), "abc")).toEqual({
      draft: saved.draft,
      conflicts: [],
      siteChanged: false,
      rebased: false,
    });
  });

  it("rebases onto the new base when the backup knows its own base", () => {
    const saved: Backup = { ...backup(), base: repoDraft() };
    saved.draft.content.site.heroFacts.experience = "Local";
    const upstream = repoDraft();
    upstream.content.site.heroFacts.shipped = "Upstream";

    const plan = planRestore(saved, upstream, "def");

    expect(plan).toMatchObject({ siteChanged: true, rebased: true, conflicts: [] });
    expect(plan.draft.content.site.heroFacts).toMatchObject({ experience: "Local", shipped: "Upstream" });
  });

  it("falls back to the whole snapshot for a backup saved without its base", () => {
    const saved = backup();
    const upstream = repoDraft();
    upstream.content.site.heroFacts.shipped = "Upstream";

    expect(planRestore(saved, upstream, "def")).toEqual({
      draft: saved.draft,
      conflicts: [],
      siteChanged: true,
      rebased: false,
    });
  });
});

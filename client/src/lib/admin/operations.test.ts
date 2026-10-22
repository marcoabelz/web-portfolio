import { describe, expect, it } from "vitest";

import { checkDraft, referencedMedia } from "./draft";
import {
  addCopyItem,
  addEntry,
  moveCopyItem,
  moveEntry,
  removeCopyItem,
  removeEntry,
  setCopy,
  setAppPrivacy,
  setCoverKind,
  setFact,
  setLabSource,
  slugify,
  uniqueId,
} from "./operations";
import { appSlugWith, FIXTURE_ARCHIVE_LAB, FIXTURE_REPO_LAB, labFixtureDraft, privateAppWithShotsDraft, repoDraft } from "./test-draft";

const base = repoDraft();
const PUBLIC = referencedMedia(base.content);
const COVER = { file: "projects", path: ["selected", 0, "cover"] } as const;

describe("ids", () => {
  it("slugifies names", () => {
    expect(slugify("  Jane Doe! ")).toBe("jane-doe");
    expect(slugify("Café Ünïcode")).toBe("cafe-unicode");
    expect(slugify("???")).toBe("");
  });

  it("keeps ids unique", () => {
    expect(uniqueId("satellyte", new Set(["satellyte", "satellyte-2"]))).toBe("satellyte-3");
    expect(uniqueId("fresh", new Set(["satellyte"]))).toBe("fresh");
  });
});

describe("entries", () => {
  it("adds the first entry to an empty collection in facts and both catalogues", () => {
    expect(base.content.portfolio.testimonials).toEqual([]);

    const { draft, id } = addEntry(base, "testimonials", { name: "Jane Doe" });

    expect(id).toBe("jane-doe");
    expect(draft.content.portfolio.testimonials).toEqual([{ id: "jane-doe", name: "Jane Doe", company: "" }]);
    expect(draft.messages.en.portfolio).toMatchObject({ testimonials: { "jane-doe": { quote: "", role: "" } } });
    expect(draft.messages.id.portfolio).toMatchObject({ testimonials: { "jane-doe": { quote: "", role: "" } } });
    expect(base.content.portfolio.testimonials).toEqual([]);
  });

  it("fails checkDraft only on the new entry's own empty required values", () => {
    const { draft } = addEntry(base, "testimonials", { name: "Jane Doe" });
    const result = checkDraft(draft, base, PUBLIC);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.length > 0 && result.issues.every((issue) => issue.path.includes("testimonials"))).toBe(
      true,
    );

    // Once the company is filled in, the blank quote and role are what remain.
    const filled = setFact(draft, { file: "portfolio", path: ["testimonials", { id: "jane-doe" }, "company"] }, "Acme");
    const rest = checkDraft(filled, base, PUBLIC);
    expect(!rest.ok && rest.issues.length > 0 && rest.issues.every((issue) => issue.file === "messages" && issue.path.includes("jane-doe"))).toBe(true);
  });

  it("accepts a new service once its copy is filled in", () => {
    let { draft, id } = addEntry(base, "services", { name: "Audits" });
    draft = setCopy(draft, "en", { domain: "portfolio", path: ["services", id, "title"] }, "Audits");
    draft = setCopy(draft, "en", { domain: "portfolio", path: ["services", id, "description"] }, "We audit.");
    draft = setCopy(draft, "id", { domain: "portfolio", path: ["services", id, "title"] }, "Audit");
    draft = setCopy(draft, "id", { domain: "portfolio", path: ["services", id, "description"] }, "Kami audit.");

    expect(checkDraft(draft, base, PUBLIC).ok).toBe(true);
  });

  it("gives a repo lab entry a description and an archive-less shape", () => {
    const { draft, id } = addEntry(base, "lab", { name: "tools" });

    expect(draft.content.portfolio.lab.at(-1)).toMatchObject({ id, source: "repo", name: "tools" });
    expect(draft.messages.en.portfolio).toMatchObject({ lab: { [id]: { description: "" } } });
  });

  it("makes ids unique across facts and copy", () => {
    const first = addEntry(base, "services", { name: "Audits" });
    const second = addEntry(first.draft, "services", { name: "Audits" });

    expect(second.id).toBe("audits-2");
  });

  it("falls back to a generic id for a name with no letters", () => {
    expect(addEntry(base, "services", { name: "???" }).id).toBe("entry");
  });

  it("appends last", () => {
    const { draft, id } = addEntry(base, "experiences", { name: "Acme" });

    expect(draft.content.portfolio.experiences.at(-1)?.id).toBe(id);
  });

  it("remove after add returns the original draft", () => {
    const { draft, id } = addEntry(base, "services", { name: "Audits" });

    expect(removeEntry(draft, "services", id)).toEqual(base);
  });

  it("leaves the draft alone when removing an unknown id", () => {
    expect(removeEntry(base, "services", "nope")).toBe(base);
  });

  it("moves entries without touching copy", () => {
    const ids = base.content.portfolio.experiences.map((e) => e.id);
    const moved = moveEntry(base, "experiences", ids[1], -1);

    expect(moved.content.portfolio.experiences.map((e) => e.id).slice(0, 2)).toEqual([ids[1], ids[0]]);
    expect(moved.messages).toBe(base.messages);
  });

  it("does nothing at the edges", () => {
    const ids = base.content.portfolio.experiences.map((e) => e.id);

    expect(moveEntry(base, "experiences", ids[0], -1)).toBe(base);
    expect(moveEntry(base, "experiences", ids[ids.length - 1], 1)).toBe(base);
    expect(moveEntry(base, "experiences", "nope", 1)).toBe(base);
  });

  it("moves slug-keyed collections", () => {
    const slugs = base.content.projects.selected.map((app) => app.slug);

    if (slugs.length > 1) {
      const moved = moveEntry(base, "selectedApps", slugs[1], -1);
      expect(moved.content.projects.selected[0].slug).toBe(slugs[1]);
    }
  });
});

describe("setCopy and setFact", () => {
  it("edits one locale only", () => {
    const ref = { domain: "portfolio", path: ["profile", "title"] } as const;
    const next = setCopy(base, "id", ref, "Judul baru");

    expect((next.messages.id.portfolio as any).profile.title).toBe("Judul baru");
    expect(next.messages.en).toBe(base.messages.en);
  });

  it("does not invent copy keys", () => {
    expect(setCopy(base, "en", { domain: "portfolio", path: ["profile", "nope"] }, "x")).toBe(base);
  });

  it("writes facts at a plain path", () => {
    const next = setFact(base, { file: "site", path: ["heroFacts", "experience"] }, "9 years");

    expect(next.content.site.heroFacts.experience).toBe("9 years");
    expect(base.content.site.heroFacts.experience).not.toBe("9 years");
  });

  it("resolves {id} segments against the current draft, even after a reorder", () => {
    const ref = { file: "site", path: ["socialLinks", { id: "gitHub" }, "href"] } as const;
    const reordered = structuredClone(base);
    reordered.content.site.socialLinks.reverse();
    const next = setFact(reordered, ref, "https://github.com/someone");

    expect(next.content.site.socialLinks.find((l) => l.id === "gitHub")?.href).toBe("https://github.com/someone");
    expect(next.content.site.socialLinks.find((l) => l.id === "email")?.href).toBe(
      base.content.site.socialLinks.find((l) => l.id === "email")?.href,
    );
  });

  it("does not write when the {id} matches nothing", () => {
    expect(setFact(base, { file: "site", path: ["socialLinks", { id: "mastodon" }, "href"] }, "x")).toBe(base);
  });

  it("does not write through a missing parent", () => {
    expect(setFact(base, { file: "site", path: ["nope", "deeper"] }, "x")).toBe(base);
  });

  it("removes an optional key when given undefined", () => {
    const next = setFact(base, { file: "projects", path: ["selected", 0, "liveUrl"] }, undefined);

    expect("liveUrl" in next.content.projects.selected[0]).toBe(false);
  });
});

describe("cover kind", () => {
  // A fixture, not the real first app: its cover is pinned to a pattern so publishing an
  // image cover for that app in /admin cannot turn these tests red.
  const base = repoDraft();
  base.content.projects.selected[0].cover = { kind: "pattern", variant: "signal" };

  it("replaces the whole object with a pattern and leaves no image keys", () => {
    const asImage = setCoverKind(base, COVER, "image");
    const back = setCoverKind(asImage, COVER, "pattern");

    expect(back.content.projects.selected[0].cover).toEqual({ kind: "pattern", variant: "signal" });
  });

  it("switches to an image placeholder with no pattern keys", () => {
    const next = setCoverKind(base, COVER, "image");

    expect(next.content.projects.selected[0].cover).toEqual({ kind: "image", src: "", width: 0, height: 0 });
  });

  it("is rejected by checkDraft until an image is uploaded", () => {
    const result = checkDraft(setCoverKind(base, COVER, "image"), base, []);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.some((issue) => issue.file === "projects" && issue.path.includes("cover"))).toBe(
      true,
    );
  });

  it("leaves the draft alone when the kind does not change or the path is no cover", () => {
    expect(setCoverKind(base, COVER, "pattern")).toBe(base);
    expect(setCoverKind(base, { file: "projects", path: ["selected", 99, "cover"] }, "image")).toBe(base);
  });
});

describe("copy lists", () => {
  const ref = { domain: "portfolio", path: ["aboutParagraphs"] } as const;
  const lengthOf = (d: typeof base, locale: "en" | "id") => (d.messages[locale].portfolio as any).aboutParagraphs.length;

  it("adds an item to both locales", () => {
    const next = addCopyItem(base, ref, "");

    expect(lengthOf(next, "en")).toBe(lengthOf(base, "en") + 1);
    expect(lengthOf(next, "id")).toBe(lengthOf(base, "id") + 1);
    expect((next.messages.en.portfolio as any).aboutParagraphs.at(-1)).toBe("");
  });

  it("adds structured items from a template", () => {
    const steps = { domain: "portfolio", path: ["process"] } as const;
    const next = addCopyItem(base, steps, { title: "T", description: "D" });

    expect((next.messages.id.portfolio as any).process.at(-1)).toEqual({ title: "", description: "" });
  });

  it("removes and moves items in both locales", () => {
    const before = (base.messages.id.portfolio as any).aboutParagraphs as string[];
    const removed = removeCopyItem(base, ref, 0);
    const moved = moveCopyItem(base, ref, 0, 1);

    expect(lengthOf(removed, "en")).toBe(lengthOf(base, "en") - 1);
    expect((moved.messages.id.portfolio as any).aboutParagraphs.slice(0, 2)).toEqual([before[1], before[0]]);
  });

  it("ignores out-of-range indexes and moves", () => {
    expect(removeCopyItem(base, ref, 99)).toBe(base);
    expect(moveCopyItem(base, ref, 0, -1)).toBe(base);
  });

  it("ignores a path that is not a list", () => {
    expect(addCopyItem(base, { domain: "portfolio", path: ["profile", "title"] }, "")).toBe(base);
  });
});

describe("shape-swapping selects", () => {
  const appCopy = (draft: typeof base, locale: "en" | "id", slug: string) =>
    (draft.messages[locale].projects as { selected: Record<string, Record<string, unknown>> }).selected[slug];
  const labCopy = (draft: typeof base, locale: "en" | "id") =>
    (draft.messages[locale].portfolio as { lab: Record<string, unknown> }).lab;

  const publicSlug = appSlugWith(base, "public");
  const privateSlug = appSlugWith(base, "private");

  it("making a public app private drops its live URL but keeps screenshots and captions in both locales", () => {
    const draft = setAppPrivacy(base, publicSlug, "private");
    const before = base.content.projects.selected.find((entry) => entry.slug === publicSlug)!;
    const app = draft.content.projects.selected.find((entry) => entry.slug === publicSlug);

    expect(app).toMatchObject({ privacy: "private", screenshots: before.screenshots });
    expect(app && "liveUrl" in app).toBe(false);
    expect(appCopy(draft, "en", publicSlug).screenshots).toEqual(appCopy(base, "en", publicSlug).screenshots);
    expect(appCopy(draft, "id", publicSlug).screenshots).toEqual(appCopy(base, "id", publicSlug).screenshots);
    expect(checkDraft(draft, base, PUBLIC).ok).toBe(true);
  });

  it("a private app with screenshots passes checkDraft and keeps them when privacy is set again", () => {
    const { draft, slug } = privateAppWithShotsDraft();
    const app = draft.content.projects.selected.find((entry) => entry.slug === slug)!;

    expect(app.screenshots.length).toBeGreaterThan(0);
    expect(checkDraft(draft, base, PUBLIC).ok).toBe(true);
    expect(setAppPrivacy(draft, slug, "private")).toBe(draft);
  });

  it("making a private app public only flips privacy", () => {
    // Without screenshots, so the result needs no live URL whatever the real app shows.
    const bare = structuredClone(base);
    bare.content.projects.selected.find((entry) => entry.slug === privateSlug)!.screenshots = [];
    for (const locale of ["en", "id"] as const) delete appCopy(bare, locale, privateSlug).screenshots;

    const draft = setAppPrivacy(bare, privateSlug, "public");
    const app = draft.content.projects.selected.find((entry) => entry.slug === privateSlug);

    expect(app?.privacy).toBe("public");
    expect(appCopy(draft, "en", privateSlug)).toEqual(appCopy(bare, "en", privateSlug));
    expect(checkDraft(draft, base, PUBLIC).ok).toBe(true);
  });

  it("ignores an unknown app or an unchanged privacy", () => {
    expect(setAppPrivacy(base, "nope", "private")).toBe(base);
    expect(setAppPrivacy(base, privateSlug, "private")).toBe(base);
  });

  const labBase = labFixtureDraft();
  const archiveIds = labBase.content.projects.archive.filter((project) => project.repositoryUrl).map((project) => project.id);

  it("switching a repo lab entry to archive keeps no repo keys and drops its copy in both locales", () => {
    const draft = setLabSource(labBase, FIXTURE_REPO_LAB, "archive");
    const entry = draft.content.portfolio.lab.find((item) => item.id === FIXTURE_REPO_LAB);

    // It points at the first archive project with a repository no other Lab entry uses yet.
    expect(entry).toEqual({ id: FIXTURE_REPO_LAB, source: "archive", archiveId: archiveIds[1] ?? archiveIds[0] });
    expect(labCopy(draft, "en")).not.toHaveProperty(FIXTURE_REPO_LAB);
    expect(labCopy(draft, "id")).not.toHaveProperty(FIXTURE_REPO_LAB);
    expect(checkDraft(draft, labBase, PUBLIC).ok).toBe(true);
  });

  it("switching an archive lab entry to repo adds a blank repo shape and copy in both locales", () => {
    const id = FIXTURE_ARCHIVE_LAB;
    const draft = setLabSource(labBase, id, "repo");
    const entry = draft.content.portfolio.lab.find((item) => item.id === id);

    expect(entry).toEqual({ id, source: "repo", name: "", url: "", stack: [] });
    expect(labCopy(draft, "en")).toMatchObject({ [id]: { description: "" } });
    expect(labCopy(draft, "id")).toMatchObject({ [id]: { description: "" } });
    expect(checkDraft(draft, labBase, PUBLIC).ok).toBe(false);

    const at = (key: string) => ({ file: "portfolio", path: ["lab", { id }, key] }) as const;
    let filled = setFact(draft, at("name"), id);
    filled = setFact(filled, at("url"), `https://github.com/example/${id}`);
    filled = setFact(filled, at("stack"), ["React"]);
    filled = setCopy(filled, "en", { domain: "portfolio", path: ["lab", id, "description"] }, "A shop clone.");
    filled = setCopy(filled, "id", { domain: "portfolio", path: ["lab", id, "description"] }, "Klon toko.");

    expect(checkDraft(filled, labBase, PUBLIC).ok).toBe(true);
  });
});

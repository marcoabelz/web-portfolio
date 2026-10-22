import { describe, expect, it } from "vitest";

import { setCopy } from "@/lib/admin/operations";
import { appSlugWith, FIXTURE_ARCHIVE_LAB, labFixtureDraft, repoDraft } from "@/lib/admin/test-draft";

import { dirtySectionIds, editorReducer, isFieldDirty, stalePreviewUrls, type EditorState } from "./state";

const lead = { domain: "portfolio", path: ["profile", "intro", "lead"] } as const;
const experience = { file: "site", path: ["heroFacts", "experience"] } as const;

function initial(): EditorState {
  const base = repoDraft();

  return { base, draft: base, baseSha: "sha1", publicFiles: [], section: "hero", query: "", previews: {} };
}

describe("editorReducer", () => {
  it("marks only the edited section dirty", () => {
    const state = editorReducer(initial(), { type: "setCopy", locale: "en", ref: lead, value: "Hello" });

    expect(Array.from(dirtySectionIds(state))).toEqual(["hero"]);
    expect(dirtySectionIds(initial()).size).toBe(0);
  });

  it("resets one copy field to the base value and clears the mark", () => {
    const path = { scope: "copy", ref: lead } as const;
    const edited = editorReducer(initial(), { type: "setCopy", locale: "en", ref: lead, value: "Hello" });

    expect(isFieldDirty(edited, path)).toBe(true);

    const reset = editorReducer(edited, { type: "resetField", path });

    expect(isFieldDirty(reset, path)).toBe(false);
    expect(reset.draft).toEqual(reset.base);
    expect(dirtySectionIds(reset).size).toBe(0);
  });

  it("resets a fact field, including an {id} path resolved against base and draft", () => {
    const edited = editorReducer(initial(), { type: "setFact", ref: experience, value: "9 years" });
    const fact = { scope: "fact", ref: experience } as const;

    expect(isFieldDirty(edited, fact)).toBe(true);
    expect(editorReducer(edited, { type: "resetField", path: fact }).draft).toEqual(edited.base);

    const first = edited.base.content.portfolio.experiences[0];
    const byId = { file: "portfolio", path: ["experiences", { id: first.id }, "company"] } as const;
    const renamed = editorReducer(initial(), { type: "setFact", ref: byId, value: "Renamed" });
    const idPath = { scope: "fact", ref: byId } as const;

    expect(isFieldDirty(renamed, idPath)).toBe(true);
    expect(editorReducer(renamed, { type: "resetField", path: idPath }).draft).toEqual(renamed.base);
  });

  it("discardAll returns to the base", () => {
    const edited = editorReducer(initial(), { type: "setCopy", locale: "id", ref: lead, value: "Halo" });

    expect(editorReducer(edited, { type: "discardAll" }).draft).toEqual(edited.base);
  });

  it("keeps the state object when an edit lands nowhere", () => {
    const state = initial();

    expect(editorReducer(state, { type: "setFact", ref: { file: "site", path: ["nope", "x"] }, value: 1 })).toBe(state);
  });

  it("attaches media to the fact, the media list, and the previews", () => {
    const media = { kind: "image" as const, repoPath: "client/public/media/p.webp", publicPath: "/media/p.webp", sha: "s1" };
    const target = { file: "site", path: ["profile", "portrait"] } as const;
    const next = editorReducer(initial(), {
      type: "attachMedia",
      media,
      target,
      size: { width: 800, height: 1000 },
      preview: "blob:1",
    });

    expect(next.draft.content.site.profile.portrait).toMatchObject({ src: "/media/p.webp", width: 800, height: 1000 });
    expect(next.draft.media).toEqual([media]);
    expect(next.previews).toEqual({ "/media/p.webp": "blob:1" });

    const again = editorReducer(next, {
      type: "attachMedia",
      media: { ...media, sha: "s2" },
      target,
      size: { width: 640, height: 480 },
      preview: "blob:2",
    });

    expect(again.draft.media).toEqual([{ ...media, sha: "s2" }]);
    expect(again.previews["/media/p.webp"]).toBe("blob:2");
    expect(again.draft.content.site.profile.portrait).toMatchObject({ width: 640, height: 480 });
    expect(stalePreviewUrls(next.previews, again.previews)).toEqual(["blob:1"]);
  });

  it("attaching a CV changes only the media list", () => {
    const media = { kind: "resume" as const, repoPath: "client/public/cv.pdf", publicPath: "/cv.pdf", sha: "s" };
    const next = editorReducer(initial(), { type: "attachMedia", media, preview: "blob:cv" });

    expect(next.draft.content).toEqual(next.base.content);
    expect(next.draft.media).toEqual([media]);
  });

  it("selects sections, searches, restores, and publishes", () => {
    const state = editorReducer(editorReducer(initial(), { type: "selectSection", id: "services" }), {
      type: "search",
      query: "api",
    });

    expect(state).toMatchObject({ section: "services", query: "api" });

    const draft = setCopy(state.base, "en", lead, "Restored");

    expect(editorReducer(state, { type: "restore", draft }).draft).toBe(draft);

    const published = editorReducer(state, { type: "published", draft, baseSha: "sha2" });

    expect(published.base).toEqual(draft);
    expect(published.draft).toBe(published.base);
    expect(published.baseSha).toBe("sha2");
    expect(dirtySectionIds(published).size).toBe(0);
  });

  const image = { kind: "image" as const, repoPath: "client/public/media/p.webp", publicPath: "/media/p.webp", sha: "s1" };
  const portrait = { file: "site", path: ["profile", "portrait"] } as const;
  const attached = () =>
    editorReducer(initial(), { type: "attachMedia", media: image, target: portrait, size: { width: 1, height: 2 }, preview: "blob:1" });

  it("leaves no orphan media or preview when the target is gone", () => {
    const state = initial();
    const next = editorReducer(state, {
      type: "attachMedia",
      media: image,
      target: { file: "site", path: ["nope", "x"] },
      size: { width: 1, height: 1 },
      preview: "blob:x",
    });

    expect(next).toBe(state);
  });

  it("resetting an image drops the upload it referenced", () => {
    const uploaded = attached();

    expect(uploaded.draft.content.site.profile.portrait).toMatchObject({ width: 1, height: 2 });

    const reset = editorReducer(uploaded, { type: "resetField", path: { scope: "fact", ref: { file: "site", path: ["profile", "portrait", "src"] } } });

    expect(reset.draft.media).toEqual([]);
    expect(reset.previews).toEqual({});
    expect(reset.draft.content.site.profile.portrait).toEqual(reset.base.content.site.profile.portrait);
    expect(reset.draft.content.site.profile.portrait.src).toBe(reset.base.content.site.profile.portrait.src);
  });

  it("prunes previews on discardAll, restore, and published", () => {
    const state = attached();

    expect(editorReducer(state, { type: "discardAll" }).previews).toEqual({});
    expect(editorReducer(state, { type: "restore", draft: state.base }).previews).toEqual({});
    expect(editorReducer(state, { type: "published", draft: state.draft, baseSha: "n" }).previews).toEqual(state.previews);
    expect(editorReducer(state, { type: "published", draft: state.base, baseSha: "n" }).previews).toEqual({});
  });

  it("after a publish, the uploads are repository files and nothing is pending", () => {
    const state = attached();
    const published = editorReducer(state, { type: "published", draft: state.draft, baseSha: "n" });

    expect(published.draft.media).toEqual([]);
    expect(published.base.media).toEqual([]);
    expect(published.publicFiles).toContain(image.publicPath);
    expect(published.draft.content.site.profile.portrait.src).toBe(image.publicPath);
    expect(dirtySectionIds(published).size).toBe(0);

    const again = editorReducer(published, { type: "published", draft: published.draft, baseSha: "m" });
    expect(again.publicFiles.filter((file) => file === image.publicPath)).toHaveLength(1);
  });

  it("never marks a field inside a session-added entry dirty", () => {
    const added = editorReducer(initial(), { type: "addEntry", collection: "services", seed: { name: "Brand new" } });
    const ref = { domain: "portfolio", path: ["services", "brand-new", "title"] } as const;
    const edited = editorReducer(added, { type: "setCopy", locale: "en", ref, value: "T" });

    expect(isFieldDirty(edited, { scope: "copy", ref })).toBe(false);
    expect(dirtySectionIds(edited).has("services")).toBe(true);
  });

  it("switches a cover kind and adds, moves, and removes entries", () => {
    const cover = { file: "projects", path: ["selected", 0, "cover"] } as const;
    const kind = editorReducer(initial(), { type: "setCoverKind", ref: cover, kind: "image" });

    expect(kind.draft.content.projects.selected[0].cover).toMatchObject({ kind: "image" });

    const added = editorReducer(initial(), { type: "addEntry", collection: "services", seed: { name: "Brand new" } });
    const order = (s: EditorState) => s.draft.content.portfolio.experiences.map((e) => e.id);
    const first = order(initial());
    const moved = editorReducer(initial(), { type: "moveEntry", collection: "experiences", id: first[0], direction: 1 });

    expect(order(moved).slice(0, 2)).toEqual([first[1], first[0]]);
    expect(dirtySectionIds(added).has("services")).toBe(true);

    const removed = editorReducer(initial(), { type: "removeEntry", collection: "experiences", id: first[0] });

    expect(order(removed)).toEqual(first.slice(1));
  });

  it("resets an optional fact that exists only in base, or only in the draft", () => {
    const url = { file: "projects", path: ["selected", 0, "liveUrl"] } as const;
    const fact = { scope: "fact", ref: url } as const;
    const removed = editorReducer(initial(), { type: "setFact", ref: url, value: undefined });

    expect(isFieldDirty(removed, fact)).toBe(true);
    expect(editorReducer(removed, { type: "resetField", path: fact }).draft).toEqual(removed.base);

    const other = { file: "projects", path: ["selected", 1, "liveUrl"] } as const;
    const added = editorReducer(initial(), { type: "setFact", ref: other, value: "https://x.test" });
    const otherFact = { scope: "fact", ref: other } as const;

    expect(isFieldDirty(added, otherFact)).toBe(true);
    expect(editorReducer(added, { type: "resetField", path: otherFact }).draft).toEqual(added.base);
  });

  it("groups only real images and returns the same state for a no-op reset", () => {
    const state = initial();
    const base = structuredClone(state.base);
    (base.content.site.heroFacts as Record<string, unknown>).width = "wide";
    const seeded = { ...state, base, draft: base };
    const width = { file: "site", path: ["heroFacts", "width"] } as const;
    const edited = editorReducer(
      editorReducer(seeded, { type: "setFact", ref: width, value: "narrow" }),
      { type: "setFact", ref: experience, value: "9 years" },
    );
    const reset = editorReducer(edited, { type: "resetField", path: { scope: "fact", ref: width } });

    expect((reset.draft.content.site.heroFacts as Record<string, unknown>).width).toBe("wide");
    expect(reset.draft.content.site.heroFacts.experience).toBe("9 years");

    const clean = initial();

    expect(editorReducer(clean, { type: "resetField", path: { scope: "fact", ref: experience } })).toBe(clean);
  });

  it("swaps the shape of an app's privacy and a lab entry's source", () => {
    const slug = appSlugWith(repoDraft(), "public");
    const priv = editorReducer(initial(), { type: "setAppPrivacy", slug, privacy: "private" });
    const app = priv.draft.content.projects.selected.find((entry) => entry.slug === slug);

    expect(app).toMatchObject({ privacy: "private" });
    expect(app?.screenshots.length).toBeGreaterThan(0);
    expect(app && "liveUrl" in app).toBe(false);

    const labBase = labFixtureDraft();
    const labStart: EditorState = { ...initial(), base: labBase, draft: labBase };
    const lab = editorReducer(labStart, { type: "setLabSource", id: FIXTURE_ARCHIVE_LAB, source: "repo" });

    expect(lab.draft.content.portfolio.lab.find((entry) => entry.id === FIXTURE_ARCHIVE_LAB)).toMatchObject({ source: "repo", url: "" });
    expect(editorReducer(labStart, { type: "setLabSource", id: FIXTURE_ARCHIVE_LAB, source: "archive" })).toBe(labStart);
  });
});

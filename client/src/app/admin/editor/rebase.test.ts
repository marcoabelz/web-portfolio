import { describe, expect, it } from "vitest";

import type { ContentDraft } from "@/lib/admin/draft";
import { repoDraft } from "@/lib/admin/test-draft";

import { rebaseDraft } from "./rebase";

type Loose = Record<string, any>;

// The three drafts of a rebase: the base the backup was made on, the backup itself
// (local edits), and the base the editor loaded now (upstream edits).
function three(): { old: ContentDraft; local: ContentDraft; upstream: ContentDraft } {
  return { old: repoDraft(), local: repoDraft(), upstream: repoDraft() };
}

const enPortfolio = (draft: ContentDraft) => draft.messages.en.portfolio as Loose;
const idPortfolio = (draft: ContentDraft) => draft.messages.id.portfolio as Loose;

describe("rebaseDraft", () => {
  it("returns the upstream draft unchanged when the backup changed nothing", () => {
    const { old, local, upstream } = three();
    upstream.content.site.heroFacts.experience = "Upstream";

    const result = rebaseDraft(old, local, upstream);

    expect(result.draft).toEqual(upstream);
    expect(result.conflicts).toEqual([]);
  });

  it("applies local edits on top of upstream edits to other leaves", () => {
    const { old, local, upstream } = three();
    local.content.site.heroFacts.experience = "Local";
    enPortfolio(local).profile.title = "Local title";
    upstream.content.site.heroFacts.shipped = "Upstream";
    idPortfolio(upstream).profile.title = "Judul baru";

    const { draft, conflicts } = rebaseDraft(old, local, upstream);

    expect(draft.content.site.heroFacts).toMatchObject({ experience: "Local", shipped: "Upstream" });
    expect(enPortfolio(draft).profile.title).toBe("Local title");
    expect(idPortfolio(draft).profile.title).toBe("Judul baru");
    expect(conflicts).toEqual([]);
  });

  it("keeps the local value of a leaf changed on both sides and lists it", () => {
    const { old, local, upstream } = three();
    local.content.site.heroFacts.experience = "Local";
    upstream.content.site.heroFacts.experience = "Upstream";
    enPortfolio(local).profile.title = "Local title";
    enPortfolio(upstream).profile.title = "Upstream title";

    const { draft, conflicts } = rebaseDraft(old, local, upstream);

    expect(draft.content.site.heroFacts.experience).toBe("Local");
    expect(enPortfolio(draft).profile.title).toBe("Local title");
    expect(conflicts).toEqual(["site.heroFacts.experience", "en:portfolio.profile.title"]);
  });

  it("does not call the same change on both sides a conflict", () => {
    const { old, local, upstream } = three();
    local.content.site.heroFacts.experience = "Same";
    upstream.content.site.heroFacts.experience = "Same";

    expect(rebaseDraft(old, local, upstream).conflicts).toEqual([]);
  });

  it("keeps message keys added upstream in both locales", () => {
    const { old, local, upstream } = three();
    (upstream.messages.en.common as Loose).labels.newThing = "New";
    (upstream.messages.id.common as Loose).labels.newThing = "Baru";
    enPortfolio(local).profile.title = "Local title";

    const { draft } = rebaseDraft(old, local, upstream);

    expect((draft.messages.en.common as Loose).labels.newThing).toBe("New");
    expect((draft.messages.id.common as Loose).labels.newThing).toBe("Baru");
    expect(enPortfolio(draft).profile.title).toBe("Local title");
  });

  it("merges collection entries by id: an upstream entry survives beside a local edit", () => {
    const { old, local, upstream } = three();
    const first = upstream.content.portfolio.experiences[0];
    upstream.content.portfolio.experiences.unshift({ ...first, id: "upstream-role", company: "Upstream Co" });
    local.content.portfolio.experiences[1].company = "Local Co";

    const { draft, conflicts } = rebaseDraft(old, local, upstream);
    const ids = draft.content.portfolio.experiences.map((role) => role.id);

    expect(ids).toEqual(upstream.content.portfolio.experiences.map((role) => role.id));
    expect(draft.content.portfolio.experiences.find((role) => role.id === old.content.portfolio.experiences[1].id)?.company).toBe("Local Co");
    expect(conflicts).toEqual([]);
  });

  it("drops an entry deleted locally when upstream left it alone", () => {
    const { old, local, upstream } = three();
    const removed = local.content.portfolio.experiences.pop()!;
    upstream.content.site.heroFacts.shipped = "Upstream";

    const { draft, conflicts } = rebaseDraft(old, local, upstream);

    expect(draft.content.portfolio.experiences.map((role) => role.id)).not.toContain(removed.id);
    expect(draft.content.site.heroFacts.shipped).toBe("Upstream");
    expect(conflicts).toEqual([]);
  });

  it("keeps the local deletion of an entry upstream edited, as a conflict", () => {
    const { old, local, upstream } = three();
    const removed = local.content.portfolio.experiences.pop()!;
    upstream.content.portfolio.experiences.find((role) => role.id === removed.id)!.company = "Renamed";

    const { draft, conflicts } = rebaseDraft(old, local, upstream);

    expect(draft.content.portfolio.experiences.map((role) => role.id)).not.toContain(removed.id);
    expect(conflicts).toEqual([`portfolio.experiences[id=${removed.id}]`]);
  });

  it("keeps a local reorder when upstream did not reorder", () => {
    const { old, local, upstream } = three();
    local.content.portfolio.experiences.reverse();
    upstream.content.site.heroFacts.shipped = "Upstream";

    const { draft } = rebaseDraft(old, local, upstream);

    expect(draft.content.portfolio.experiences.map((role) => role.id)).toEqual(
      local.content.portfolio.experiences.map((role) => role.id),
    );
  });

  it("keeps pending uploads the merged content still references", () => {
    const { old, local, upstream } = three();
    local.content.site.profile.portrait = { src: "/media/2026/me-1234abcd.webp", width: 10, height: 10 };
    local.media = [
      { kind: "image", repoPath: "client/public/media/2026/me-1234abcd.webp", publicPath: "/media/2026/me-1234abcd.webp", sha: "a".repeat(40) },
      { kind: "image", repoPath: "client/public/media/2026/gone-1234abcd.webp", publicPath: "/media/2026/gone-1234abcd.webp", sha: "b".repeat(40) },
    ];

    const { draft } = rebaseDraft(old, local, upstream);

    expect(draft.content.site.profile.portrait.src).toBe("/media/2026/me-1234abcd.webp");
    expect(draft.media.map((entry) => entry.publicPath)).toEqual(["/media/2026/me-1234abcd.webp"]);
  });
});

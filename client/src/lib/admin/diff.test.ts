import { describe, expect, it } from "vitest";

import { commitMessage, countChanges, diffDraft, type ChangeGroup } from "./diff";
import { addEntry, moveEntry, removeEntry, setCopy, setCoverKind, setFact } from "./operations";
import { repoDraft } from "./test-draft";

const base = repoDraft();
const heroLead = { domain: "portfolio", path: ["profile", "intro", "lead"] } as const;
const serviceTitle = (id: string) => ({ domain: "portfolio", path: ["services", id, "title"] }) as const;

function groupsFor(ids: string[]): ChangeGroup[] {
  return ids.map((sectionId) => ({
    sectionId,
    title: sectionId[0].toUpperCase() + sectionId.slice(1),
    changes: [{ label: "x", kind: "edited" }],
  }));
}

describe("diffDraft", () => {
  it("is empty for identical drafts", () => {
    expect(diffDraft(base, structuredClone(base))).toEqual([]);
  });

  it("groups changes by section and writes the commit message", () => {
    const edited = setCopy(setCopy(base, "en", heroLead, "New lead"), "id", serviceTitle("apis-infra"), "API baru");
    const groups = diffDraft(base, edited);

    expect(groups.map((g) => g.sectionId)).toEqual(["hero", "services"]);
    expect(commitMessage(groups)).toBe("content: update hero, services");
    expect(countChanges(groups)).toBe(2);
  });

  it("labels a copy edit with the field label and its locale", () => {
    const [group] = diffDraft(base, setCopy(base, "en", heroLead, "New lead"));

    expect(group.changes).toEqual([
      expect.objectContaining({ label: "Intro, first part", kind: "edited", locale: "en", after: "New lead" }),
    ]);
    expect(group.changes[0].before).toBeTruthy();
  });

  it("labels a fact edit", () => {
    const [group] = diffDraft(base, setFact(base, { file: "site", path: ["heroFacts", "experience"] }, "9 years"));

    expect(group.sectionId).toBe("hero");
    expect(group.changes[0]).toMatchObject({ label: "Years of experience", kind: "edited", after: "9 years" });
  });

  it("follows sidebar order whatever order the edits were made in", () => {
    const edited = setCopy(setCopy(base, "en", serviceTitle("apis-infra"), "API"), "en", heroLead, "x");

    expect(diffDraft(base, edited).map((g) => g.sectionId)).toEqual(["hero", "services"]);
  });

  it("keeps a social link on its field after a reorder", () => {
    const reordered = structuredClone(base);
    reordered.content.site.socialLinks.reverse();
    const reorderedOnly = diffDraft(base, reordered);

    expect(reorderedOnly.flatMap((g) => g.changes).every((c) => c.kind !== "edited")).toBe(true);

    const edited = setFact(reordered, { file: "site", path: ["socialLinks", { id: "gitHub" }, "href"] }, "https://github.com/x");
    const groups = diffDraft(base, edited);
    const edits = groups.flatMap((g) => g.changes).filter((c) => c.kind === "edited");

    expect(edits).toEqual([expect.objectContaining({ label: "GitHub link", after: "https://github.com/x" })]);
    expect(groups.find((g) => g.changes.some((c) => c.label === "GitHub link"))?.sectionId).toBe("contact");
  });

  it("reports an added entry once, not as a pile of leaves", () => {
    const { draft } = addEntry(base, "testimonials", { name: "Jane Doe" });
    const groups = diffDraft(base, draft);

    expect(groups).toHaveLength(1);
    expect(groups[0].sectionId).toBe("testimonials");
    expect(groups[0].changes).toEqual([expect.objectContaining({ kind: "added", label: "Testimonials: Jane Doe" })]);
  });

  it("reports a removed entry once", () => {
    const groups = diffDraft(base, removeEntry(base, "services", "apis-infra"));

    expect(groups.map((g) => g.sectionId)).toEqual(["services"]);
    expect(groups[0].changes).toEqual([expect.objectContaining({ kind: "removed", label: expect.stringContaining("Services") })]);
  });

  it("reports a moved entry and nothing else", () => {
    const ids = base.content.portfolio.experiences.map((e) => e.id);
    const groups = diffDraft(base, moveEntry(base, "experiences", ids[1], -1));

    expect(groups.map((g) => g.sectionId)).toEqual(["experience"]);
    expect(groups[0].changes.every((c) => c.kind === "moved")).toBe(true);
    expect(groups[0].changes.length).toBeGreaterThan(0);
  });

  it("prefixes entry field edits with the entry title", () => {
    const app = base.content.projects.selected[0];
    const edited = setCopy(base, "en", { domain: "projects", path: ["selected", app.slug, "role"] }, "Lead");
    const [group] = diffDraft(base, edited);

    expect(group.sectionId).toBe("apps");
    expect(group.changes[0].label).toBe(`${app.name}: Your role`);
  });

  it("follows an entry's fields by id when entries are reordered", () => {
    const ids = base.content.portfolio.experiences.map((e) => e.id);
    const reordered = moveEntry(base, "experiences", ids[1], -1);
    const edited = setFact(reordered, { file: "portfolio", path: ["experiences", 0, "location"] }, "Mars");
    const edits = diffDraft(base, edited)
      .flatMap((g) => g.changes)
      .filter((c) => c.kind === "edited");

    expect(edits).toEqual([expect.objectContaining({ label: expect.stringContaining("Location"), after: "Mars" })]);
  });

  it("collapses tags into one change", () => {
    const stack = [...base.content.site.dailyStack, "Rust"];
    const [group] = diffDraft(base, setFact(base, { file: "site", path: ["dailyStack"] }, stack));

    expect(group.changes).toHaveLength(1);
    expect(group.changes[0].after).toContain("Rust");
  });

  it("describes a cover kind switch", () => {
    // Switch to the kind the first app does not have, whatever the content uses today.
    const next = base.content.projects.selected[0].cover.kind === "image" ? "pattern" : "image";
    const groups = diffDraft(base, setCoverKind(base, { file: "projects", path: ["selected", 0, "cover"] }, next));

    expect(groups[0].sectionId).toBe("apps");
    expect(groups[0].changes.some((c) => c.label.endsWith("Cover") && c.after === next)).toBe(true);
  });

  it("lists an uploaded image as added under the field that references it", () => {
    const edited = setFact(base, { file: "site", path: ["profile", "portrait", "src"] }, "/media/2026/me-1234abcd.webp");
    edited.media = [
      { kind: "image", repoPath: "client/public/media/2026/me-1234abcd.webp", publicPath: "/media/2026/me-1234abcd.webp", sha: "s" },
    ];
    const [group] = diffDraft(base, edited);

    expect(group.sectionId).toBe("hero");
    expect(group.changes).toContainEqual(expect.objectContaining({ kind: "added", after: "/media/2026/me-1234abcd.webp" }));
  });

  it("ignores uploads the draft no longer references", () => {
    const edited = structuredClone(base);
    edited.media = [{ kind: "image", repoPath: "client/public/media/a.webp", publicPath: "/media/a.webp", sha: "s" }];

    expect(diffDraft(base, edited)).toEqual([]);
  });

  it("puts unmapped paths under Other, last", () => {
    const edited = setCopy(base, "en", heroLead, "x");
    (edited.messages.en.common as any).labels.unmapped = "added";
    (edited.messages.id.common as any).labels.unmapped = "ditambah";
    const draftBase = structuredClone(base);
    (draftBase.messages.en.common as any).labels.unmapped = "old";
    (draftBase.messages.id.common as any).labels.unmapped = "lama";
    const groups = diffDraft(draftBase, edited);

    expect(groups.map((g) => g.sectionId)).toEqual(["hero", "other"]);
    expect(groups.at(-1)).toMatchObject({ title: "Other" });
  });

  it("accepts a custom section list", () => {
    const groups = diffDraft(base, setCopy(base, "en", heroLead, "x"), []);

    expect(groups).toEqual([expect.objectContaining({ sectionId: "other", title: "Other" })]);
  });
});

describe("commitMessage", () => {
  it("summarises more than three sections", () => {
    expect(commitMessage(groupsFor(["hero", "apps", "about", "lab", "contact"]))).toBe(
      "content: update hero, apps, about and 2 more",
    );
  });

  it("lists up to three in full and lower-cases titles", () => {
    expect(commitMessage(groupsFor(["hero", "apps", "about"]))).toBe("content: update hero, apps, about");
  });

  it("has a plain fallback for no groups", () => {
    expect(commitMessage([])).toBe("content: update");
  });

  it("shows an image's size as well as its path", () => {
    const portrait = base.content.site.profile.portrait;
    const edited = setFact(base, { file: "site", path: ["profile", "portrait"] }, {
      ...portrait,
      width: portrait.width + 10,
    });
    const [group] = diffDraft(base, edited);

    expect(group.changes).toEqual([
      expect.objectContaining({ kind: "edited", after: expect.stringContaining(`${portrait.width + 10}x${portrait.height}`) }),
    ]);
  });

  it("names a moved homepage section by its title, not its id", () => {
    const sections = [...base.content.site.sections];
    const [first] = sections.splice(0, 1);
    sections.push(first);
    const groups = diffDraft(base, setFact(base, { file: "site", path: ["sections"] }, sections));
    const labels = groups.flatMap((g) => g.changes.filter((c) => c.kind === "moved").map((c) => c.label));

    expect(labels.length).toBeGreaterThan(0);
    expect(labels.join(" ")).toContain("Selected apps");
    expect(labels.join(" ")).not.toContain(": apps");
  });
});

import { describe, expect, it } from "vitest";

import { removeEntry, setCopy, setFact } from "@/lib/admin/operations";
import { EDITOR_SECTIONS } from "@/lib/admin/schema";
import { labFixtureDraft, repoDraft } from "@/lib/admin/test-draft";
import { serializeJson } from "@/lib/admin/draft";

import { buildReview, isSaveShortcut, issueLabel } from "./review";

const base = repoDraft();
// The Lab tests need an archive Lab entry, which the real content may not have.
const labBase = labFixtureDraft();
const heroLead = { domain: "portfolio", path: ["profile", "intro", "lead"] } as const;
// Every public file the repository's content points at.
const publicFiles = [
  base.content.site.profile.resumePath,
  base.content.site.profile.portrait.src,
  ...base.content.projects.selected.flatMap((app) => [
    ...(app.cover.kind === "image" ? [app.cover.src] : []),
    ...app.screenshots.map((shot) => shot.src),
  ]),
  ...base.content.projects.archive.map((project) => project.cover.src),
];

const labPublicFiles = [
  ...publicFiles,
  ...labBase.content.projects.archive.map((project) => project.cover.src),
];

describe("buildReview", () => {
  it("blocks publishing when a Lab entry points at a removed Archive project", () => {
    const lab = labBase.content.portfolio.lab.find((entry) => entry.source === "archive");

    expect(lab).toBeDefined();

    const review = buildReview(labBase, removeEntry(labBase, "archiveProjects", (lab as { archiveId: string }).archiveId), labPublicFiles);

    expect(review.canPublish).toBe(false);
    expect(review.issues.map((i) => issueLabel(i, EDITOR_SECTIONS))).toContainEqual(expect.stringContaining("Lab"));
  });

  it("allows a clean edit and previews the commit message", () => {
    expect(buildReview(base, setCopy(base, "en", heroLead, "New"), publicFiles)).toMatchObject({
      canPublish: true,
      message: "content: update hero",
      issues: [],
    });
  });

  it("says more checks run later when an early stage failed", () => {
    const broken = structuredClone(base);
    broken.content.site.profile.name = 42 as unknown as string;
    const review = buildReview(base, broken, publicFiles);

    expect(review.canPublish).toBe(false);
    expect(review.moreChecks).toBe(true);
  });

  it("does not claim hidden checks when the last stage ran", () => {
    const lab = labBase.content.portfolio.lab.find((entry) => entry.source === "archive") as { archiveId: string };
    const review = buildReview(labBase, removeEntry(labBase, "archiveProjects", lab.archiveId), labPublicFiles);

    expect(review.issues.length).toBeGreaterThan(0);
    expect(review.moreChecks).toBe(false);
  });

  it("has nothing to publish for an untouched draft", () => {
    expect(buildReview(base, structuredClone(base), publicFiles)).toMatchObject({
      canPublish: false,
      unlisted: false,
      groups: [],
    });
  });

  it("publishes a byte-level change no field names, as formatting or unlisted", () => {
    const edited = structuredClone(base);
    // Same values, different key order: no listed change, different file bytes.
    const { name, ...rest } = edited.content.site.profile;
    edited.content.site.profile = { ...rest, name } as typeof edited.content.site.profile;

    expect(serializeJson(edited.content.site)).not.toBe(serializeJson(base.content.site));

    const review = buildReview(base, edited, publicFiles);

    expect(review).toMatchObject({ groups: [], unlisted: true, canPublish: true, message: "content: update" });
  });

  it("blocks a missing upload", () => {
    const edited = setFact(base, { file: "site", path: ["profile", "portrait", "src"] }, "/media/missing.webp");
    const review = buildReview(base, edited, publicFiles);

    expect(review.canPublish).toBe(false);
    expect(review.issues.map((i) => issueLabel(i, EDITOR_SECTIONS)).join("\n")).toContain("/media/missing.webp");
  });
});

describe("isSaveShortcut", () => {
  it.each([
    [{ key: "s", metaKey: true, ctrlKey: false }, true],
    [{ key: "S", metaKey: false, ctrlKey: true }, true],
    [{ key: "s", metaKey: false, ctrlKey: false }, false],
    [{ key: "a", metaKey: true, ctrlKey: false }, false],
  ])("save shortcut %o", (event, expected) => {
    expect(isSaveShortcut(event)).toBe(expected);
  });
});

describe("issueLabel", () => {
  it("names the section and entry for a collection fact", () => {
    const labIndex = labBase.content.portfolio.lab.findIndex((entry) => entry.source === "archive");
    const id = (labBase.content.portfolio.lab[labIndex] as { id: string }).id;
    const label = issueLabel(
      { file: "portfolio", path: `lab[${labIndex}].archiveId`, message: 'No archive project with id "x".' },
      EDITOR_SECTIONS,
      labBase,
    );

    expect(label).toBe(`Lab › ${id}: No archive project with id "x".`);
  });

  it("names the section for a collection's copy", () => {
    const label = issueLabel(
      { file: "messages", path: "id.portfolio.experiences.acme", message: 'Missing id copy for "acme".' },
      EDITOR_SECTIONS,
    );

    expect(label).toBe('Experience › acme (Indonesian): Missing id copy for "acme".');
  });

  it("labels upload issues under Uploads", () => {
    expect(issueLabel({ file: "media", path: "media[0].repoPath", message: "Bad path." }, EDITOR_SECTIONS)).toBe(
      "Uploads › media[0].repoPath: Bad path.",
    );
  });

  it("falls back to the file and path", () => {
    expect(issueLabel({ file: "site", path: "profile.name", message: "Required." }, EDITOR_SECTIONS)).toBe(
      "site › profile.name: Required.",
    );
  });
});

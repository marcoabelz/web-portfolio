import { describe, expect, it } from "vitest";

import commonEn from "../../../messages/en/common.json";
import portfolioEn from "../../../messages/en/portfolio.json";
import projectsEn from "../../../messages/en/projects.json";
import commonId from "../../../messages/id/common.json";
import portfolioId from "../../../messages/id/portfolio.json";
import projectsId from "../../../messages/id/projects.json";
import portfolioJson from "../../../content/portfolio.json";
import projectsJson from "../../../content/projects.json";
import siteJson from "../../../content/site.json";

import type { ContentDraft } from "./draft";
import { withFixtureScreenshot } from "./test-draft";
import {
  danglingFieldPaths,
  EDITOR_SECTIONS,
  uncoveredCopyPaths,
  uncoveredFactPaths,
  resolveFactPath,
  type FieldDef,
} from "./schema";

function draftFromRepoFiles(): ContentDraft {
  return structuredClone({
    content: { site: siteJson, portfolio: portfolioJson, projects: projectsJson },
    messages: {
      en: { common: commonEn, portfolio: portfolioEn, projects: projectsEn },
      id: { common: commonId, portfolio: portfolioId, projects: projectsId },
    },
    media: [],
  }) as unknown as ContentDraft;
}

function withExtraKey(draft: ContentDraft, path: [string, string, ...string[]]): ContentDraft {
  const [locale, domain, ...rest] = path;
  let node = (draft.messages as any)[locale][domain];
  for (const key of rest.slice(0, -1)) node = node[key];
  node[rest[rest.length - 1]] = "x";
  return draft;
}

function allFields(fields: readonly FieldDef[]): FieldDef[] {
  return fields.flatMap((field) => [
    field,
    ...(field.kind === "collection" ? allFields(field.fields) : []),
    ...(field.kind === "copyList" ? allFields(field.item) : []),
  ]);
}

describe("editor schema", () => {
  it("reaches every message leaf and every fact in the current files", () => {
    const draft = draftFromRepoFiles();
    expect(uncoveredCopyPaths(EDITOR_SECTIONS, draft)).toEqual([]);
    expect(uncoveredFactPaths(EDITOR_SECTIONS, draft)).toEqual([]);
  });

  it("points only at paths that exist", () => {
    expect(danglingFieldPaths(EDITOR_SECTIONS, draftFromRepoFiles())).toEqual([]);
  });

  it("does not report a field whose entry kind no entry currently has (lab without a repo entry)", () => {
    const draft = draftFromRepoFiles();
    const lab = draft.content.portfolio.lab as Record<string, unknown>[];
    const repoIds = lab.filter((entry) => entry.source === "repo").map((entry) => String(entry.id));
    draft.content.portfolio.lab = lab.filter((entry) => entry.source !== "repo") as typeof draft.content.portfolio.lab;
    for (const locale of ["en", "id"] as const) {
      for (const id of repoIds) delete (draft.messages[locale].portfolio as any).lab[id];
    }
    expect(repoIds.length).toBeGreaterThan(0);
    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toEqual([]);
  });

  it("does not report the optional repository URL when no archive project has one", () => {
    const draft = draftFromRepoFiles();
    for (const project of draft.content.projects.archive as Record<string, unknown>[]) delete project.repositoryUrl;
    draft.content.portfolio.lab = (draft.content.portfolio.lab as Record<string, unknown>[]).filter(
      (entry) => entry.source !== "archive",
    ) as typeof draft.content.portfolio.lab;
    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toEqual([]);
  });

  it("does not report the pattern select when every app cover is an image", () => {
    const draft = draftFromRepoFiles();
    for (const app of draft.content.projects.selected as Record<string, any>[]) {
      app.cover = { kind: "image", src: "/media/x.webp", width: 1600, height: 1000 };
    }
    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toEqual([]);
  });

  it("still reports a guarded field missing from an entry that has that kind", () => {
    const draft = draftFromRepoFiles();
    const repo = (draft.content.portfolio.lab as Record<string, unknown>[]).find((entry) => entry.source === "repo")!;
    delete repo.url;
    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toContain("portfolio.url");
  });

  it("reports a new message key as uncovered instead of hiding it", () => {
    expect(
      uncoveredCopyPaths(
        EDITOR_SECTIONS,
        withExtraKey(draftFromRepoFiles(), ["en", "common", "labels", "newThing"]),
      ),
    ).toEqual(["common.labels.newThing"]);
  });

  it("reports a new fact as uncovered", () => {
    const draft = draftFromRepoFiles();
    (draft.content.site.profile as Record<string, unknown>).pronouns = "he/him";
    expect(uncoveredFactPaths(EDITOR_SECTIONS, draft)).toEqual(["site.profile.pronouns"]);
  });

  it("reports a field pointing at a missing path", () => {
    const draft = draftFromRepoFiles();
    delete (draft.messages.en.common as any).footer;
    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toContain("en:common.footer.copyright");
  });

  it("lists sections in page order with unique ids", () => {
    expect(EDITOR_SECTIONS.map((s) => s.id)).toEqual([
      "site", "hero", "apps", "archive", "about", "services",
      "experience", "stack", "testimonials", "lab", "contact", "layout",
    ]);
  });

  it("gives every field a label and every section a title, place and view path", () => {
    for (const section of EDITOR_SECTIONS) {
      expect(section.title).not.toBe("");
      expect(section.where).not.toBe("");
      expect(section.viewPath).toMatch(/^\//);
      for (const field of allFields(section.fields)) expect(field.label.trim()).not.toBe("");
    }
  });

  it("marks screenshot captions as a fixed list", () => {
    const apps = EDITOR_SECTIONS.find((s) => s.id === "apps")!;
    const collection = apps.fields.find((f) => f.kind === "collection");
    const captions = allFields(collection && collection.kind === "collection" ? collection.fields : []).find(
      (f) => f.kind === "textList" && f.copy.path.join(".") === "screenshots",
    );
    expect(captions).toMatchObject({ fixed: true });
  });

  it("does not report screenshot captions as dangling when no app has screenshots", () => {
    const draft = draftFromRepoFiles();
    draft.content.projects.selected.forEach((app) => {
      app.screenshots = [];
    });
    for (const locale of ["en", "id"] as const) {
      const selected = (draft.messages[locale].projects as unknown as { selected: Record<string, Record<string, unknown>> }).selected;
      Object.values(selected).forEach((entry) => delete entry.screenshots);
    }

    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toEqual([]);
  });

  it("reports a renamed caption key when the apps that have screenshots all lost theirs", () => {
    // One app gets a screenshot the test owns, so this holds even if /admin removes every real one.
    const draft = draftFromRepoFiles();
    withFixtureScreenshot(draft, draft.content.projects.selected[0].slug);
    const slugs = draft.content.projects.selected.filter((entry) => entry.screenshots.length > 0).map((entry) => entry.slug);

    for (const locale of ["en", "id"] as const) {
      const selected = (draft.messages[locale].projects as unknown as { selected: Record<string, Record<string, unknown>> }).selected;
      for (const slug of slugs) {
        selected[slug].shots = selected[slug].screenshots;
        delete selected[slug].screenshots;
      }
    }

    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toEqual(
      expect.arrayContaining(["en:projects.screenshots", "id:projects.screenshots"]),
    );
  });

  it("reports a new key inside a list item instead of hiding it under the list", () => {
    const draft = draftFromRepoFiles();
    (draft.messages.en.portfolio as any).process[0].icon = "x";
    expect(uncoveredCopyPaths(EDITOR_SECTIONS, draft)).toEqual(["portfolio.process[0].icon"]);
  });

  it("reports a new key inside an app cover", () => {
    const draft = draftFromRepoFiles();
    (draft.content.projects.selected[0].cover as Record<string, unknown>).focus = "top";
    expect(uncoveredFactPaths(EDITOR_SECTIONS, draft)).toEqual(["projects.selected[0].cover.focus"]);
  });

  it("binds social link fields by id, so reordering the file moves nothing", () => {
    const contact = EDITOR_SECTIONS.find((s) => s.id === "contact")!;
    const linkedIn = contact.fields.find((f) => f.label === "LinkedIn link");
    if (!linkedIn || linkedIn.kind !== "fact") throw new Error("missing field");

    const draft = draftFromRepoFiles();
    const before = draft.content.site.socialLinks.findIndex((l) => l.id === "linkedIn");
    draft.content.site.socialLinks.reverse();
    const after = draft.content.site.socialLinks.findIndex((l) => l.id === "linkedIn");

    expect(after).not.toBe(before);
    expect(resolveFactPath(draft.content.site, linkedIn.fact.path)).toEqual(["socialLinks", after, "href"]);
    expect(uncoveredFactPaths(EDITOR_SECTIONS, draft)).toEqual([]);
    expect(danglingFieldPaths(EDITOR_SECTIONS, draft)).toEqual([]);
  });

  it("lets a private app pick an image cover", () => {
    const apps = EDITOR_SECTIONS.find((s) => s.id === "apps")!;
    const collection = apps.fields.find((f) => f.kind === "collection");
    const fields = collection && collection.kind === "collection" ? collection.fields : [];
    const image = fields.find((f) => f.kind === "image" && f.label === "Cover image");
    expect(image?.showWhen).toEqual({ fact: { file: "projects", path: ["cover", "kind"] }, equals: "image" });
  });
});

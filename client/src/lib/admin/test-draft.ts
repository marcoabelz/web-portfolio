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

// The repository's own files as a draft, for tests of draft operations and diffs.
export function repoDraft(): ContentDraft {
  return structuredClone({
    content: { site: siteJson, portfolio: portfolioJson, projects: projectsJson },
    messages: {
      en: { common: commonEn, portfolio: portfolioEn, projects: projectsEn },
      id: { common: commonId, portfolio: portfolioId, projects: projectsId },
    },
    media: [],
  }) as unknown as ContentDraft;
}

export const FIXTURE_REPO_LAB = "fixture-repo";
export const FIXTURE_ARCHIVE_LAB = "fixture-archive";
export const FIXTURE_ARCHIVE_PROJECT = "fixture-archive-project";

// Makes sure the draft has an archive project with a public repository, which an archive
// Lab entry needs, and returns its id. When no real project has one, the first archive
// project gets a fixture repository URL; with no archive project at all, a fixture project
// with copy in both locales is added (its cover is the profile portrait, which every valid
// content set has).
function archiveProjectWithRepository(draft: ContentDraft): string {
  const archive = draft.content.projects.archive;
  const existing = archive.find((project) => project.repositoryUrl);
  if (existing) return existing.id;

  const first = archive[0];
  if (first) {
    first.repositoryUrl = `https://github.com/example/${first.id}`;
    return first.id;
  }

  const { src, width, height } = draft.content.site.profile.portrait;
  archive.push({
    id: FIXTURE_ARCHIVE_PROJECT,
    contextId: "commercial",
    name: FIXTURE_ARCHIVE_PROJECT,
    stack: ["TypeScript"],
    cover: { src, width, height },
    repositoryUrl: `https://github.com/example/${FIXTURE_ARCHIVE_PROJECT}`,
  } as (typeof archive)[number]);

  for (const locale of ["en", "id"] as const) {
    const copy = (draft.messages[locale].projects as unknown as { archive: Record<string, unknown> }).archive;
    copy[FIXTURE_ARCHIVE_PROJECT] = {
      descriptor: `Fixture archive project (${locale}).`,
      contextLabel: `Fixture (${locale})`,
      coverAlt: `Fixture cover (${locale})`,
    };
  }

  return FIXTURE_ARCHIVE_PROJECT;
}

// The repository draft with a Lab list the tests own: one repo entry (with copy in both
// locales) and one archive entry pointing at an archive project with a public repository
// (see archiveProjectWithRepository). Lab tests use it so editing the real Lab list or the
// Archive in /admin never breaks them.
export function labFixtureDraft(): ContentDraft {
  const draft = repoDraft();
  const archiveId = archiveProjectWithRepository(draft);

  draft.content.portfolio.lab = [
    {
      id: FIXTURE_REPO_LAB,
      source: "repo",
      name: FIXTURE_REPO_LAB,
      url: `https://github.com/example/${FIXTURE_REPO_LAB}`,
      stack: ["TypeScript"],
    },
    { id: FIXTURE_ARCHIVE_LAB, source: "archive", archiveId },
  ];

  for (const locale of ["en", "id"] as const) {
    (draft.messages[locale].portfolio as { lab: unknown }).lab = {
      [FIXTURE_REPO_LAB]: { description: `Fixture repository (${locale}).` },
    };
  }

  return draft;
}

// The slug of the first app with this privacy in the repository files.
export function appSlugWith(draft: ContentDraft, privacy: "public" | "private"): string {
  const app = draft.content.projects.selected.find((entry) => entry.privacy === privacy);

  if (!app) {
    throw new Error(`The repository has no ${privacy} app to test against`);
  }

  return app.slug;
}

// Gives one app a screenshot and a caption in both locales that the tests own. The picture
// is the profile portrait, the one image every valid content set has, so checkDraft finds
// the file whatever the real apps show.
export function withFixtureScreenshot(draft: ContentDraft, slug: string): ContentDraft {
  const app = draft.content.projects.selected.find((entry) => entry.slug === slug);
  if (!app) throw new Error(`No app "${slug}" to give a fixture screenshot`);

  const { src, width, height } = draft.content.site.profile.portrait;
  app.screenshots = [{ src, width, height }];

  for (const locale of ["en", "id"] as const) {
    const selected = (draft.messages[locale].projects as unknown as { selected: Record<string, { screenshots?: unknown }> }).selected;
    selected[slug].screenshots = [`Fixture screenshot (${locale}).`];
  }

  return draft;
}

// The repository draft with a private app that shows screenshots, built without relying on
// which real app is private or has screenshots: the first app is made private (no live
// URL) and given the fixture screenshot.
export function privateAppWithShotsDraft(): { draft: ContentDraft; slug: string } {
  const draft = repoDraft();
  const target = draft.content.projects.selected[0];

  if (!target) {
    throw new Error("The repository needs at least one app to build this fixture");
  }

  target.privacy = "private";
  delete (target as { liveUrl?: string }).liveUrl;
  withFixtureScreenshot(draft, target.slug);

  return { draft, slug: target.slug };
}

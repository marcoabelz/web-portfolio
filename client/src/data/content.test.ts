import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import portfolioJson from "../../content/portfolio.json";
import projectsJson from "../../content/projects.json";
import siteJson from "../../content/site.json";
import { checkCatalogParity } from "@/lib/content/catalog";
import { checkContentReferences, parseContentFiles } from "@/lib/content/validate";
import { getContentFiles } from "@/lib/content/load";
import { getAllMessages } from "@/i18n/messages";
import * as projectData from "@/data/projects";
import { NAV_SECTION_IDS } from "@/components/sections/registry";
import { getHomeSections, getNavigation } from "@/data/home";
import * as portfolioData from "@/data/portfolio";
import { getMessages } from "@/i18n/messages";
import {
  getPortfolioContent,
} from "@/data/portfolio";
import {
  getArchiveProjects,
  getProject,
  getSelectedProjectSlugs,
  getSelectedProjects,
} from "@/data/projects";
import type { SocialLink, YearMonth } from "@/types/portfolio";

const validYearMonth: YearMonth = "2026-03";
// @ts-expect-error YearMonth requires a four-digit year.
const shortYearMonth: YearMonth = "26-03";
// @ts-expect-error YearMonth requires a zero-padded month.
const unpaddedYearMonth: YearMonth = "2026-3";
// @ts-expect-error YearMonth rejects months outside 01 through 12.
const invalidYearMonth: YearMonth = "2026-13";
const invalidSocialLabel: SocialLink = {
  id: "email",
  // @ts-expect-error Social-link labels are restricted to approved catalog values.
  label: "Unsupported",
  href: "mailto:test@example.com",
  external: false,
};

void validYearMonth;
void shortYearMonth;
void unpaddedYearMonth;
void invalidYearMonth;
void invalidSocialLabel;

const validHttpUrl = (href: string) => {
  try {
    const url = new URL(href);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
};
const allNonBlank = (values: readonly string[]) => values.every((value) => value.trim() !== "");

describe("portfolio content", () => {
  it("does not expose implicit English portfolio compatibility APIs", () => {
    for (const exportName of [
      "PROFILE",
      "ABOUT_FACTS",
      "NAVIGATION",
      "SOCIAL_LINKS",
      "ABOUT_PARAGRAPHS",
      "EXPERIENCES",
      "SKILL_GROUPS",
      "EDUCATION",
      "LANGUAGES",
    ]) {
      expect(portfolioData).not.toHaveProperty(exportName);
    }
  });

  it("does not expose implicit English project compatibility APIs", () => {
    expect(projectData).not.toHaveProperty("SELECTED_PROJECTS");
    expect(projectData).not.toHaveProperty("ARCHIVE_PROJECTS");
    expect(() => (
      getProject as unknown as (slug: string) => unknown
    )(getContentFiles().projects.selected[0].slug)).toThrow();
  });

  it.each(["en", "id"] as const)("builds complete, nonblank %s content", (locale) => {
    const portfolio = getPortfolioContent(locale);
    const selectedProjects = getSelectedProjects(locale);
    const archiveProjects = getArchiveProjects(locale);

    const facts = getContentFiles();
    expect(portfolio.experiences).toHaveLength(facts.portfolio.experiences.length);
    expect(selectedProjects).toHaveLength(facts.projects.selected.length);
    expect(archiveProjects).toHaveLength(facts.projects.archive.length);
    expect(allNonBlank(portfolio.aboutParagraphs)).toBe(true);

    for (const experience of portfolio.experiences) {
      expect(allNonBlank([experience.summary, ...experience.highlights])).toBe(true);
    }

    for (const project of selectedProjects) {
      expect(allNonBlank([
        project.descriptor,
        project.role,
        project.outcome,
        ...project.highlights,
        ...Object.values(project.caseStudy).flat(),
      ])).toBe(true);
    }

    expect(allNonBlank(archiveProjects.map((project) => project.descriptor))).toBe(true);
  });

  it("localizes narrative copy while preserving portfolio and project facts", () => {
    const englishPortfolio = getPortfolioContent("en");
    const indonesianPortfolio = getPortfolioContent("id");
    const englishSelected = getSelectedProjects("en");
    const indonesianSelected = getSelectedProjects("id");
    const englishArchive = getArchiveProjects("en");
    const indonesianArchive = getArchiveProjects("id");

    expect(indonesianPortfolio.profile.intro.lead).not.toBe(englishPortfolio.profile.intro.lead);
    englishSelected.forEach((project, index) => {
      expect(indonesianSelected[index].outcome).not.toBe(project.outcome);
    });
    expect(indonesianSelected.map((project) => project.slug)).toEqual(
      getContentFiles().projects.selected.map((app) => app.slug),
    );
    expect(indonesianSelected.map((project) => project.slug)).toEqual(
      englishSelected.map((project) => project.slug),
    );

    expect(indonesianPortfolio.experiences.map(({ company, location, startDate, endDate, stack }) => ({
      company,
      location,
      startDate,
      endDate,
      stack,
    }))).toEqual(englishPortfolio.experiences.map(({ company, location, startDate, endDate, stack }) => ({
      company,
      location,
      startDate,
      endDate,
      stack,
    })));
    expect(indonesianSelected.map(({ slug, name, contextId, privacy, stack, ...project }) => ({
      slug,
      name,
      contextId,
      privacy,
      stack,
      liveUrl: "liveUrl" in project ? project.liveUrl : undefined,
      cover: project.cover.kind === "image"
        ? { kind: project.cover.kind, src: project.cover.src }
        : { kind: project.cover.kind, variant: project.cover.variant },
    }))).toEqual(englishSelected.map(({ slug, name, contextId, privacy, stack, ...project }) => ({
      slug,
      name,
      contextId,
      privacy,
      stack,
      liveUrl: "liveUrl" in project ? project.liveUrl : undefined,
      cover: project.cover.kind === "image"
        ? { kind: project.cover.kind, src: project.cover.src }
        : { kind: project.cover.kind, variant: project.cover.variant },
    })));
    expect(indonesianArchive.map(({ id, name, contextId, stack, cover, ...project }) => ({
      id,
      name,
      contextId,
      stack,
      coverSrc: cover.src,
      repositoryUrl: "repositoryUrl" in project ? project.repositoryUrl : undefined,
    }))).toEqual(englishArchive.map(({ id, name, contextId, stack, cover, ...project }) => ({
      id,
      name,
      contextId,
      stack,
      coverSrc: cover.src,
      repositoryUrl: "repositoryUrl" in project ? project.repositoryUrl : undefined,
    })));
    expect(indonesianPortfolio.education.map((item) => item.institution)).toEqual(
      englishPortfolio.education.map((item) => item.institution),
    );
    expect({
      name: indonesianPortfolio.profile.name,
      location: indonesianPortfolio.profile.location,
      email: indonesianPortfolio.profile.email,
      resumePath: indonesianPortfolio.profile.resumePath,
      socialLinks: indonesianPortfolio.socialLinks.map(({ href, external }) => ({ href, external })),
    }).toEqual({
      name: englishPortfolio.profile.name,
      location: englishPortfolio.profile.location,
      email: englishPortfolio.profile.email,
      resumePath: englishPortfolio.profile.resumePath,
      socialLinks: englishPortfolio.socialLinks.map(({ href, external }) => ({ href, external })),
    });
  });

  it.each(["en", "id"] as const)("uses %s navigation and project display labels", (locale) => {
    const messages = getMessages(locale);
    const portfolio = getPortfolioContent(locale);

    const { navigation } = messages.common;
    const labelById = new Map(Object.entries(navigation));

    expect(getNavigation(locale).map((item) => item.label)).toEqual(
      getNavigation(locale).map((item) => labelById.get(item.href.slice(2))),
    );
    expect(portfolio.socialLinks.map(({ id }) => id)).toEqual(siteJson.socialLinks.map(({ id }) => id));

    // One context id means one label, so a badge never reads two ways.
    const labels = new Map<string, string>();

    for (const { contextId, contextLabel } of [...getSelectedProjects(locale), ...getArchiveProjects(locale)]) {
      expect(contextLabel.trim()).not.toBe("");
      expect(labels.get(contextId) ?? contextLabel).toBe(contextLabel);
      labels.set(contextId, contextLabel);
    }
  });

  it("returns isolated content graphs from repeated getter calls", () => {
    const firstPortfolio = getPortfolioContent("en");
    const secondPortfolio = getPortfolioContent("en");
    expect(firstPortfolio).not.toBe(secondPortfolio);
    expect(firstPortfolio.profile).not.toBe(secondPortfolio.profile);
    expect(firstPortfolio.socialLinks).not.toBe(secondPortfolio.socialLinks);
    expect(firstPortfolio.aboutParagraphs).not.toBe(secondPortfolio.aboutParagraphs);
    expect(firstPortfolio.experiences).not.toBe(secondPortfolio.experiences);
    expect(firstPortfolio.skillGroups).not.toBe(secondPortfolio.skillGroups);
    expect(firstPortfolio.education).not.toBe(secondPortfolio.education);
    expect(firstPortfolio.languages).not.toBe(secondPortfolio.languages);
    expect(firstPortfolio.socialLinks[0]).not.toBe(secondPortfolio.socialLinks[0]);
    expect(firstPortfolio.experiences[0]).not.toBe(secondPortfolio.experiences[0]);
    expect(firstPortfolio.skillGroups[0]).not.toBe(secondPortfolio.skillGroups[0]);
    expect(firstPortfolio.education[0]).not.toBe(secondPortfolio.education[0]);
    expect(firstPortfolio.languages[0]).not.toBe(secondPortfolio.languages[0]);
    expect(firstPortfolio.experiences[0].highlights).not.toBe(secondPortfolio.experiences[0].highlights);
    expect(firstPortfolio.experiences[0].stack).not.toBe(secondPortfolio.experiences[0].stack);
    expect(firstPortfolio.skillGroups[0].skills).not.toBe(secondPortfolio.skillGroups[0].skills);

    const firstSelected = getSelectedProjects("en");
    const secondSelected = getSelectedProjects("en");
    expect(firstSelected).not.toBe(secondSelected);
    expect(firstSelected[0].highlights).not.toBe(secondSelected[0].highlights);
    expect(firstSelected[0].stack).not.toBe(secondSelected[0].stack);
    expect(firstSelected[0].cover).not.toBe(secondSelected[0].cover);
    expect(firstSelected[0].caseStudy).not.toBe(secondSelected[0].caseStudy);
    for (const section of Object.keys(firstSelected[0].caseStudy) as (keyof typeof firstSelected[0]["caseStudy"])[]) {
      expect(firstSelected[0].caseStudy[section]).not.toBe(secondSelected[0].caseStudy[section]);
    }

    const firstArchive = getArchiveProjects("en");
    const secondArchive = getArchiveProjects("en");
    expect(firstArchive).not.toBe(secondArchive);
    expect(firstArchive[0].stack).not.toBe(secondArchive[0].stack);
    expect(firstArchive[0].cover).not.toBe(secondArchive[0].cover);

    const slug = getContentFiles().projects.selected[0].slug;
    const firstProject = getProject(slug, "en");
    const secondProject = getProject(slug, "en");
    expect(firstProject).not.toBe(secondProject);
    expect(firstProject?.highlights).not.toBe(secondProject?.highlights);
    expect(firstProject?.stack).not.toBe(secondProject?.stack);
    expect(firstProject?.cover).not.toBe(secondProject?.cover);
    expect(firstProject?.caseStudy).not.toBe(secondProject?.caseStudy);
    if (firstProject && secondProject) {
      for (const section of Object.keys(firstProject.caseStudy) as (keyof typeof firstProject.caseStudy)[]) {
        expect(firstProject.caseStudy[section]).not.toBe(secondProject.caseStudy[section]);
      }
    }
  });

  it("keeps navigation anchors in step with the section ids", () => {
    const portfolio = getPortfolioContent("en");
    const sectionIds = getHomeSections().map(({ id }) => id);

    expect(getNavigation("en").map((item) => item.href.slice(2))).toEqual(
      sectionIds.filter((id) => NAV_SECTION_IDS.some((navId) => navId === id)),
    );
    expect(portfolio.profile.name).toBe(siteJson.profile.name);
  });

  it("derives machine-readable experience ranges from the content file", () => {
    const experiences = getPortfolioContent("en").experiences;

    expect(experiences.map(({ id, company, startDate, endDate }) => ({ id, company, startDate, endDate }))).toEqual(
      portfolioJson.experiences.map(({ id, company, startDate, endDate }) => ({ id, company, startDate, endDate })),
    );
  });

  it("contains complete, uniquely-addressable selected projects", () => {
    const selectedProjects = getSelectedProjects("en");

    expect(selectedProjects.map((project) => project.slug)).toEqual(
      projectsJson.selected.map((app) => app.slug),
    );
    expect(new Set(selectedProjects.map((project) => project.slug)).size).toBe(selectedProjects.length);

    for (const project of selectedProjects) {
      expect(allNonBlank([
        project.slug,
        project.name,
        project.descriptor,
        project.role,
        project.outcome,
        project.cover.alt,
      ])).toBe(true);
      expect(project.highlights.length).toBeGreaterThan(0);
      expect(allNonBlank(project.highlights)).toBe(true);
      expect(project.stack.length).toBeGreaterThan(0);
      expect(allNonBlank(project.stack)).toBe(true);
      expect(Object.values(project.caseStudy).every((section) => section.length > 0)).toBe(true);
      expect(Object.values(project.caseStudy).every(allNonBlank)).toBe(true);

      if (project.cover.kind === "image") {
        expect(project.cover.src.trim()).not.toBe("");
      }

      if (project.privacy === "public") {
        // A public app may have no live URL, but one that is set has to be valid.
        if (project.liveUrl) {
          expect(validHttpUrl(project.liveUrl)).toBe(true);
        }
      } else {
        expect("liveUrl" in project).toBe(false);
      }
    }
  });

  it("carries every screenshot's stored size into the model", () => {
    const facts = getContentFiles().projects.selected;

    for (const project of getSelectedProjects("en")) {
      const fact = facts.find((entry) => entry.slug === project.slug)!;

      expect(project.screenshots.map(({ width, height }) => ({ width, height }))).toEqual(
        fact.screenshots.map(({ width, height }) => ({ width, height })),
      );
    }
  });

  it("gives a private app no live URL", () => {
    for (const project of getSelectedProjects("en")) {
      if (project.privacy === "private") {
        expect("liveUrl" in project).toBe(false);
      }
    }
  });

  it("gets a selected project by slug", () => {
    const selectedProjects = getSelectedProjects("en");

    selectedProjects.forEach((project) => {
      expect(getProject(project.slug, "en")).toEqual(project);
      expect(getProject(project.slug, "en")).not.toBe(project);
    });
    expect(getProject("unknown-project", "en")).toBeUndefined();
  });

  it("lists the archive from the content file without placeholder links", () => {
    const archiveProjects = getArchiveProjects("en");

    expect(archiveProjects.map((project) => project.id)).toEqual(
      projectsJson.archive.map((project) => project.id),
    );

    for (const project of archiveProjects) {
      expect(project.stack.length).toBeGreaterThan(0);
      expect(allNonBlank([project.name, project.descriptor, project.cover.alt, ...project.stack])).toBe(true);
      expect(project.cover.src.trim()).not.toBe("");
      expect(project.cover.alt).not.toMatch(/project picture/i);

      if (project.repositoryUrl) {
        expect(/^https:\/\/github\.com\//.test(project.repositoryUrl)).toBe(true);
      }
    }
  });

  it("keeps every content file valid and consistent with the message catalogs", () => {
    const raw = { site: siteJson, portfolio: portfolioJson, projects: projectsJson };
    const parsed = parseContentFiles(raw);

    expect(parsed.ok ? [] : parsed.issues).toEqual([]);

    if (parsed.ok) {
      expect(checkContentReferences(parsed.value, getAllMessages())).toEqual([]);
    }

    expect(checkCatalogParity(getAllMessages())).toEqual([]);
  });

  it("points every asset path at a file under public/", () => {
    const { site, projects } = getContentFiles();
    const sources: string[] = [
      site.profile.resumePath,
      site.profile.portrait.src,
      ...projects.selected.flatMap((app) => [
        ...(app.cover.kind === "image" ? [app.cover.src] : []),
        ...app.screenshots.map((shot) => shot.src),
      ]),
      ...projects.archive.map((project) => project.cover.src),
    ];

    for (const src of sources) {
      expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
  });

  it("renders a case study for every selected slug in both locales", () => {
    for (const locale of ["en", "id"] as const) {
      for (const slug of getSelectedProjectSlugs()) {
        expect(getProject(slug, locale)?.slug).toBe(slug);
      }
    }

    expect(getSelectedProjectSlugs()).toEqual(projectsJson.selected.map((app) => app.slug));
  });

  it("keeps ids in their expected formats and unique within each list", () => {
    const slugFormat = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const lists = [
      portfolioJson.experiences.map((item) => item.id),
      projectsJson.selected.map((item) => item.slug),
      projectsJson.archive.map((item) => item.id),
    ];

    for (const ids of lists) {
      for (const id of ids) {
        expect(id).toMatch(slugFormat);
      }

      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

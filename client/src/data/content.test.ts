import { describe, expect, it } from "vitest";
import * as projectData from "@/data/projects";
import * as portfolioData from "@/data/portfolio";
import { getMessages } from "@/i18n/messages";
import {
  getPortfolioContent,
  HOME_SECTION_IDS,
} from "@/data/portfolio";
import {
  getArchiveProjects,
  getProject,
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
    )("satellyte")).toThrow();
  });

  it.each(["en", "id"] as const)("builds complete, nonblank %s content", (locale) => {
    const portfolio = getPortfolioContent(locale);
    const selectedProjects = getSelectedProjects(locale);
    const archiveProjects = getArchiveProjects(locale);

    expect(portfolio.experiences).toHaveLength(4);
    expect(selectedProjects).toHaveLength(5);
    expect(archiveProjects).toHaveLength(7);
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

    expect(indonesianPortfolio.profile.introduction).not.toBe(englishPortfolio.profile.introduction);
    expect(englishSelected[0].outcome).toContain("signals");
    expect(indonesianSelected[0].outcome).toContain("sinyal");
    expect(indonesianSelected.map((project) => project.slug)).toEqual([
      "satellyte",
      "palmgrade",
      "ai-recruitment-platform",
      "internal-erp-platform",
      "factory-monitoring-system",
    ]);
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

    expect(portfolio.navigation.map((item) => item.label)).toEqual([
      messages.common.navigation.work,
      messages.common.navigation.experience,
      messages.common.navigation.skills,
      messages.common.navigation.contact,
    ]);
    expect(portfolio.socialLinks.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "email", label: "Email" },
      { id: "linkedIn", label: "LinkedIn" },
      { id: "gitHub", label: "GitHub" },
      { id: "whatsApp", label: "WhatsApp" },
    ]);
    expect(getSelectedProjects(locale).map(({ contextId, contextLabel }) => ({ contextId, contextLabel }))).toEqual(
      locale === "en"
        ? [
          { contextId: "production", contextLabel: "Production" },
          { contextId: "production", contextLabel: "Production" },
          { contextId: "commercial", contextLabel: "Commercial" },
          { contextId: "internal", contextLabel: "Internal" },
          { contextId: "production", contextLabel: "Production" },
        ]
        : [
          { contextId: "production", contextLabel: "Produksi" },
          { contextId: "production", contextLabel: "Produksi" },
          { contextId: "commercial", contextLabel: "Komersial" },
          { contextId: "internal", contextLabel: "Internal" },
          { contextId: "production", contextLabel: "Produksi" },
        ],
    );
    expect(getArchiveProjects(locale).map(({ contextId, contextLabel }) => ({ contextId, contextLabel }))).toEqual(
      locale === "en"
        ? [
          { contextId: "commercial", contextLabel: "Commercial" },
          { contextId: "commercial", contextLabel: "Commercial" },
          ...Array.from({ length: 5 }, () => ({ contextId: "training", contextLabel: "Training" })),
        ]
        : [
          { contextId: "commercial", contextLabel: "Komersial" },
          { contextId: "commercial", contextLabel: "Komersial" },
          ...Array.from({ length: 5 }, () => ({ contextId: "training", contextLabel: "Pelatihan" })),
        ],
    );
  });

  it("returns isolated content graphs from repeated getter calls", () => {
    const firstPortfolio = getPortfolioContent("en");
    const secondPortfolio = getPortfolioContent("en");
    expect(firstPortfolio).not.toBe(secondPortfolio);
    expect(firstPortfolio.profile).not.toBe(secondPortfolio.profile);
    expect(firstPortfolio.aboutFacts).not.toBe(secondPortfolio.aboutFacts);
    expect(firstPortfolio.navigation).not.toBe(secondPortfolio.navigation);
    expect(firstPortfolio.socialLinks).not.toBe(secondPortfolio.socialLinks);
    expect(firstPortfolio.aboutParagraphs).not.toBe(secondPortfolio.aboutParagraphs);
    expect(firstPortfolio.experiences).not.toBe(secondPortfolio.experiences);
    expect(firstPortfolio.skillGroups).not.toBe(secondPortfolio.skillGroups);
    expect(firstPortfolio.education).not.toBe(secondPortfolio.education);
    expect(firstPortfolio.languages).not.toBe(secondPortfolio.languages);
    expect(firstPortfolio.navigation[0]).not.toBe(secondPortfolio.navigation[0]);
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

    const firstProject = getProject("satellyte", "en");
    const secondProject = getProject("satellyte", "en");
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

  it("keeps the approved positioning and section anchors", () => {
    const portfolio = getPortfolioContent("en");

    expect(portfolio.profile.name).toBe("Marco Abel Zefanya");
    expect(portfolio.profile.title).toBe("Full-Stack Engineer");
    expect(portfolio.aboutFacts).toEqual([
      "4+ years combined experience",
      "Software Engineer & Software Quality Assurance",
      portfolio.profile.location,
    ]);
    expect(portfolio.navigation.map((item) => item.label)).toEqual([
      "Project",
      "Experience",
      "Skills",
      "Contact",
    ]);
    expect(portfolio.navigation.map((item) => item.href.slice(2))).toEqual(HOME_SECTION_IDS);
  });

  it("contains the four current roles with exact titles and dates", () => {
    const experiences = getPortfolioContent("en").experiences;
    expect(experiences.map(({ company, title, start, end }) => ({ company, title, start, end }))).toEqual([
      { company: "Satellyte", title: "Full-Stack Engineer", start: "March 2026", end: "Present" },
      { company: "PT Nexio Teknologi", title: "Full-Stack Engineer", start: "September 2025", end: "March 2026" },
      { company: "PT Delta Anugrah", title: "Full-Stack Developer", start: "August 2024", end: "August 2025" },
      { company: "PT SYS Indonesia", title: "Software QA Engineer", start: "September 2021", end: "November 2023" },
    ]);
  });

  it("provides canonical month values for machine-readable experience ranges", () => {
    const experiences = getPortfolioContent("en").experiences;
    expect(experiences.map(({ startDate, endDate }) => ({ startDate, endDate }))).toEqual([
      { startDate: "2026-03", endDate: null },
      { startDate: "2025-09", endDate: "2026-03" },
      { startDate: "2024-08", endDate: "2025-08" },
      { startDate: "2021-09", endDate: "2023-11" },
    ]);
  });

  it("contains exactly five complete, uniquely-addressable selected projects", () => {
    const selectedProjects = getSelectedProjects("en");

    expect(selectedProjects).toHaveLength(5);
    expect(selectedProjects.map((project) => project.slug)).toEqual([
      "satellyte",
      "palmgrade",
      "ai-recruitment-platform",
      "internal-erp-platform",
      "factory-monitoring-system",
    ]);
    expect(new Set(selectedProjects.map((project) => project.slug)).size).toBe(5);

    for (const project of selectedProjects) {
      expect(allNonBlank([
        project.slug,
        project.name,
        project.descriptor,
        project.role,
        project.outcome,
        project.cover.alt,
      ])).toBe(true);
      expect(project.highlights).toHaveLength(3);
      expect(allNonBlank(project.highlights)).toBe(true);
      expect(project.stack.length).toBeGreaterThanOrEqual(5);
      expect(project.stack.length).toBeLessThanOrEqual(8);
      expect(allNonBlank(project.stack)).toBe(true);
      expect(Object.values(project.caseStudy).every((section) => section.length > 0)).toBe(true);
      expect(Object.values(project.caseStudy).every(allNonBlank)).toBe(true);

      if (project.cover.kind === "image") {
        expect(project.cover.src.trim()).not.toBe("");
      }

      if (project.privacy === "public") {
        expect(validHttpUrl(project.liveUrl)).toBe(true);
      } else {
        expect("liveUrl" in project).toBe(false);
      }
    }
  });

  it("keeps the exact selected-project access facts", () => {
    const selectedProjects = getSelectedProjects("en");

    expect(selectedProjects.map((project) => ({
      slug: project.slug,
      privacy: project.privacy,
      liveUrl: "liveUrl" in project ? project.liveUrl : undefined,
    }))).toEqual([
      { slug: "satellyte", privacy: "public", liveUrl: "https://satellyte.ai" },
      { slug: "palmgrade", privacy: "private", liveUrl: undefined },
      { slug: "ai-recruitment-platform", privacy: "private", liveUrl: undefined },
      { slug: "internal-erp-platform", privacy: "private", liveUrl: undefined },
      { slug: "factory-monitoring-system", privacy: "private", liveUrl: undefined },
    ]);
  });

  it("gets a selected project by slug", () => {
    const selectedProjects = getSelectedProjects("en");

    expect(getProject("satellyte", "en")).toEqual(selectedProjects[0]);
    expect(getProject("satellyte", "en")).not.toBe(selectedProjects[0]);
    expect(getProject("unknown-project", "en")).toBeUndefined();
  });

  it("contains the exact approved archive without placeholder links", () => {
    const archiveProjects = getArchiveProjects("en");

    expect(archiveProjects.map((project) => project.name)).toEqual([
      "Nutrical",
      "Zamasto",
      "M Event",
      "Xiaopee",
      "Instaclone",
      "Chatting App",
      "Omahucok",
    ]);
    expect(archiveProjects.map((project) => ({
      name: project.name,
      repositoryUrl: "repositoryUrl" in project ? project.repositoryUrl : undefined,
    }))).toEqual([
      { name: "Nutrical", repositoryUrl: undefined },
      { name: "Zamasto", repositoryUrl: undefined },
      { name: "M Event", repositoryUrl: undefined },
      { name: "Xiaopee", repositoryUrl: "https://github.com/marcoabelz/xiaopee" },
      { name: "Instaclone", repositoryUrl: "https://github.com/marcoabelz/instaclone" },
      { name: "Chatting App", repositoryUrl: undefined },
      { name: "Omahucok", repositoryUrl: "https://github.com/marcoabelz/IP-HCK71" },
    ]);

    for (const project of archiveProjects) {
      expect(project.stack.length).toBeGreaterThan(0);
      expect(allNonBlank([
        project.name,
        project.descriptor,
        project.cover.alt,
        ...project.stack,
      ])).toBe(true);
      expect(project.cover.src.trim()).not.toBe("");
      expect(project.cover.alt).not.toMatch(/project picture/i);

      if (project.repositoryUrl) {
        expect(project.repositoryUrl).not.toBe("-");
        expect(/^https:\/\/github\.com\//.test(project.repositoryUrl)).toBe(true);
      }
    }
  });
});

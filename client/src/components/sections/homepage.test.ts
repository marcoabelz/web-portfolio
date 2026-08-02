import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));

import LocalizedHome from "@/app/[locale]/page";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { getPortfolioContent } from "@/data/portfolio";
import { getSelectedProjects } from "@/data/projects";
import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/locale";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type ExternalLinkProps = React.ComponentProps<typeof ExternalLink>;
const validExternalLinkProps: ExternalLinkProps = { href: "https://example.com" };
// @ts-expect-error ExternalLink always opens in a new tab and owns target.
const externalLinkWithTarget: ExternalLinkProps = { href: "https://example.com", target: "_self" };
// @ts-expect-error ExternalLink owns its security relationship.
const externalLinkWithRel: ExternalLinkProps = { href: "https://example.com", rel: "opener" };
// @ts-expect-error ExternalLink requires a destination.
const externalLinkWithoutHref: ExternalLinkProps = {};

void validExternalLinkProps;
void externalLinkWithTarget;
void externalLinkWithRel;
void externalLinkWithoutHref;

function decodeVisibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replace(/\s+/g, " ")
    .trim();
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function renderHomepage(locale: Locale): Promise<{
  html: string;
  text: string;
}> {
  const page = await LocalizedHome({ params: { locale } });
  const html = renderToStaticMarkup(page);

  return { html, text: decodeVisibleText(html) };
}

describe.each(["en", "id"] as const)("localized %s homepage", (locale) => {
  it("renders every section heading, introduction, and visible call to action", async () => {
    const { html, text } = await renderHomepage(locale);
    const portfolio = getPortfolioContent(locale);
    const projects = getSelectedProjects(locale);
    const { common } = getMessages(locale);

    expect(text).toContain(portfolio.profile.title);
    // The hero leads with the about paragraphs now; profile.introduction and
    // profile.specialty are only kept as source material for the chat prompt.
    expect(text).not.toContain(portfolio.profile.introduction);

    expect(text).toContain(common.actions.viewSelectedWork);
    expect(text).toContain(common.actions.downloadResume);
    expect(text).toContain(common.actions.getInTouch);

    expect(text).toContain(common.sections.selectedWork.eyebrow);
    expect(text).toContain(common.sections.selectedWork.title);
    expect(text).toContain(common.sections.selectedWork.description);
    expect(text).toContain(common.actions.viewCaseStudy);
    expect(text).toContain(common.actions.liveProduct);
    expect(text).toContain(common.labels.privateProject);
    expect(text).toContain(common.actions.browseEarlierProjects);

    expect(text).toContain(common.sections.experience.eyebrow);
    expect(text).toContain(common.sections.experience.title);
    expect(text).toContain(common.sections.skills.eyebrow);
    expect(text).toContain(common.sections.skills.title);
    expect(text).toContain(common.sections.credentials.eyebrow);
    expect(text).toContain(common.sections.credentials.title);
    expect(text).toContain(common.sections.credentials.education);
    expect(text).toContain(common.sections.credentials.languages);
    expect(text).toContain(common.sections.contact.eyebrow);
    expect(text).toContain(common.sections.contact.title);

    expect(text).toContain(portfolio.aboutFacts[0]);
    expect(text).toContain(portfolio.aboutParagraphs[0]);
    expect(text).toContain(portfolio.experiences[0].summary);
    expect(text).toContain(portfolio.skillGroups[0].title);
    expect(text).toContain(portfolio.education[0].program);
    expect(text).toContain(portfolio.languages[0].proficiency);
    expect(text).toContain(portfolio.profile.availability);
    expect(text).toContain(
      common.labels.basedIn.replace("{location}", portfolio.profile.location),
    );

    projects.forEach((project) => {
      expect(text).toContain(project.contextLabel);
      expect(text).toContain(project.descriptor);
    });

    const headingPositions = [
      "hero-heading",
      "work-heading",
      "experience-heading",
      "skills-heading",
      "credentials-heading",
      "contact-heading",
    ].map((id) => html.indexOf(`id="${id}"`));
    expect(headingPositions.every((position) => position >= 0)).toBe(true);
    expect(headingPositions).toEqual([...headingPositions].sort((a, b) => a - b));
  });

  it("renders localized routes and the complete homepage accessibility contract", async () => {
    const { html } = await renderHomepage(locale);
    const portfolio = getPortfolioContent(locale);
    const projects = getSelectedProjects(locale);
    const { common } = getMessages(locale);
    const prefix = locale === "en" ? "" : "/id";

    expect(html).toContain(`href="${prefix || "/"}#work"`);
    expect(html).toContain(`href="${prefix || "/"}#contact"`);
    expect(html).toContain(`href="${prefix}/work/archive"`);
    projects.forEach((project) => {
      expect(html).toContain(`href="${prefix}/work/${project.slug}"`);
    });
    expect(
      Array.from(html.matchAll(/href="(?:\/id)?\/work\/(?!archive(?:"|\/))[^"#]+"/g)),
    ).toHaveLength(projects.length);

    expect(html).toContain(
      `aria-label="${escapeAttribute(common.accessibility.projectHighlights)}"`,
    );
    expect(html).toContain(
      `aria-label="${escapeAttribute(common.accessibility.technologyStack)}"`,
    );

    portfolio.experiences.forEach((experience) => {
      const label = common.accessibility.experienceTechnologyStack.replace(
        "{company}",
        experience.company,
      );
      expect(html).toContain(`aria-label="${escapeAttribute(label)}"`);
    });

    projects.forEach((project) => {
      expect(project.cover.alt.trim()).not.toBe("");
      expect(html).toContain(
        project.cover.kind === "image"
          ? `alt="${escapeAttribute(project.cover.alt)}"`
          : `aria-label="${escapeAttribute(project.cover.alt)}"`,
      );
    });

    const publicProject = projects.find((project) => project.privacy === "public")!;
    const liveProductLabel = common.accessibility.openLiveProduct.replace(
      "{projectName}",
      publicProject.name,
    );
    expect(html).toContain(
      `aria-label="${escapeAttribute(`${liveProductLabel} (${common.accessibility.opensInNewTab})`)}"`,
    );
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');

    portfolio.socialLinks
      .filter((social) => social.external)
      .forEach((social) => {
        const contactLabel = common.accessibility.contactOnSocial
          .replace("{name}", portfolio.profile.name)
          .replace("{platform}", social.label);
        expect(html).toContain(
          `aria-label="${escapeAttribute(`${contactLabel} (${common.accessibility.opensInNewTab})`)}"`,
        );
      });
  });
});

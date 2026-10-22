import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));

import LocalizedHome from "@/app/[locale]/page";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { getHomeSections } from "@/data/home";
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

// The way React escapes an attribute value, apostrophes included ("child's" in an alt).
function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
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
    expect(text).toContain(portfolio.profile.intro.lead);
    expect(text).toContain(portfolio.profile.intro.tail);

    expect(text).toContain(common.actions.viewApps);
    expect(text).toContain(common.actions.startProject);
    expect(text).toContain(common.actions.downloadResume);

    expect(text).toContain(common.sections.apps.title);
    expect(text).toContain(common.sections.apps.description);
    expect(text).toContain(common.sections.apps.privateNote);
    expect(text).toContain(common.sections.apps.live);
    expect(text).toContain(common.actions.viewCaseStudy);
    expect(text).toContain(common.labels.privateProductionSystem);
    expect(text).toContain(common.actions.browseEarlierProjects);

    expect(text).toContain(common.sections.experience.description);
    expect(text).toContain(common.sections.experience.title);
    expect(text).toContain(common.sections.stack.title);
    expect(text).toContain(common.sections.stack.description);
    expect(text).toContain(common.sections.about.title);
    expect(text).toContain(common.sections.about.education);
    expect(text).toContain(common.sections.about.languages);
    // Every about paragraph renders, whatever the editor makes them say.
    portfolio.aboutParagraphs.forEach((paragraph) => expect(text).toContain(paragraph));
    expect(text).toContain(common.sections.contact.label);
    expect(text).toContain(common.sections.contact.titleLead);
    expect(text).toContain(common.sections.contact.titleAccent);

    expect(text).toContain(portfolio.experiences[0].summary);
    expect(text).toContain(portfolio.skillGroups[0].title);
    expect(text).toContain(portfolio.education[0].program);
    expect(text).toContain(portfolio.languages[0].proficiency);
    expect(text).toContain(portfolio.profile.availability);

    projects.forEach((project) => {
      expect(text).toContain(project.contextLabel);
    });

    const headingIds: Record<string, string> = {
      apps: "apps-heading",
      about: "about-heading",
      services: "services-heading",
      experience: "experience-heading",
      stack: "stack-heading",
      testimonials: "testimonials-heading",
      lab: "lab-heading",
      contact: "contact-heading",
    };
    const headingPositions = [
      "hero-heading",
      ...getHomeSections().map(({ id }) => headingIds[id]),
    ].map((id) => html.indexOf(`id="${id}"`));
    expect(headingPositions.every((position) => position >= 0)).toBe(true);
    expect(headingPositions).toEqual([...headingPositions].sort((a, b) => a - b));
  });

  it("renders sections in content order with their anchors", async () => {
    const { html } = await renderHomepage(locale);
    const ids = Array.from(html.matchAll(/<section[^>]*id="([a-z]+)"/g), (match) => match[1]);

    expect(ids).toEqual(getHomeSections().map((section) => section.id));
  });

  it("renders localized routes and the complete homepage accessibility contract", async () => {
    const { html } = await renderHomepage(locale);
    const portfolio = getPortfolioContent(locale);
    const projects = getSelectedProjects(locale);
    const { common } = getMessages(locale);
    const prefix = locale === "en" ? "" : "/id";

    expect(html).toContain(`href="${prefix || "/"}#apps"`);
    expect(html).toContain(`href="${prefix || "/"}#contact"`);
    expect(html).toContain(`href="${prefix}/work/archive"`);
    projects.forEach((project) => {
      expect(html).toContain(`href="${prefix}/work/${project.slug}"`);
    });
    expect(
      Array.from(html.matchAll(/href="(?:\/id)?\/work\/(?!archive(?:"|\/))[^"#]+"/g)),
    ).toHaveLength(projects.length);

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

    // A card with screenshots (featured, or private with dummy data) shows its image
    // cover when it has one, otherwise its first screenshot; without screenshots it
    // shows the sanitized cover.
    projects.forEach((project) => {
      expect(project.cover.alt.trim()).not.toBe("");
      if (project.screenshots.length > 0) {
        const alt = project.cover.kind === "image" ? project.cover.alt : project.screenshots[0].alt;
        expect(html).toContain(`alt="${escapeAttribute(alt)}"`);
      } else {
        expect(html).toContain(`aria-label="${escapeAttribute(project.cover.alt)}"`);
      }
    });

    const publicProject = projects.find((project) => project.privacy === "public")!;
    const liveProductLabel = common.accessibility.openLiveProduct.replace(
      "{projectName}",
      publicProject.name,
    );
    expect(html).toContain(
      `aria-label="${escapeAttribute(`${common.sections.apps.live}: ${liveProductLabel} (${common.accessibility.opensInNewTab})`)}"`,
    );
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');

    // Every external social is reachable from the contact section.
    portfolio.socialLinks
      .filter((social) => social.external)
      .forEach((social) => {
        expect(html).toContain(`href="${escapeAttribute(social.href)}"`);
      });
  });
});

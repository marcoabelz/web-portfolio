import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
// The shell layout now owns the fonts, and next/font only runs inside the compiler.
vi.mock("next/font/google", () => ({
  Inter_Tight: () => ({ variable: "--font-display" }),
  Inter: () => ({ variable: "--font-sans" }),
  JetBrains_Mono: () => ({ variable: "--font-mono" }),
}));

import ProjectPage, {
  generateMetadata as generateProjectMetadata,
  generateStaticParams as generateProjectStaticParams,
} from "@/app/[locale]/work/[slug]/page";
import ArchivePage, {
  generateMetadata as generateArchiveMetadata,
  generateStaticParams as generateArchiveStaticParams,
} from "@/app/[locale]/work/archive/page";
import { generateMetadata as generateHomeMetadata } from "@/app/[locale]/layout";
import OpenGraphImage, {
  alt as openGraphImageAlt,
  contentType as openGraphImageContentType,
} from "@/app/opengraph-image";
import { getProject, getSelectedProjectSlugs } from "@/data/projects";
import { getMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";
import { SOCIAL_IMAGE_IDENTITY } from "@/lib/social-image";

// Rules, not copy: the slug and name come from the content files, so editing or
// reordering apps in /admin cannot turn these tests red.
const SLUG = getSelectedProjectSlugs()[0];

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function absolute(path: string): string {
  return new URL(path, SITE.url).href;
}

function visibleText(node: React.ReactNode): string {
  return renderToStaticMarkup(node)
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

describe.each([
  ["en", "/", "en_US"],
  ["id", "/id", "id_ID"],
] as const)("%s homepage metadata", (locale, pathname, openGraphLocale) => {
  it("uses localized copy, canonical, language alternates, and shared social image", () => {
    const labels = getMessages(locale).common.labels;
    const title = labels.siteMetadataTitle.replace("{name}", SITE.name);
    const description = labels.siteMetadataDescription;
    const metadata = generateHomeMetadata({ params: { locale } });

    expect(metadata).toMatchObject({
      title,
      description,
      alternates: {
        canonical: absolute(pathname),
        languages: {
          en: absolute("/"),
          id: absolute("/id"),
        },
      },
      openGraph: {
        type: "website",
        locale: openGraphLocale,
        title,
        description,
        url: absolute(pathname),
        images: [{ url: absolute("/opengraph-image") }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [{ url: absolute("/opengraph-image") }],
      },
    });
  });
});

describe("shared Open Graph image", () => {
  it("remains one locale-neutral PNG identity response", () => {
    const response = OpenGraphImage();

    expect(response.status).toBe(200);
    expect(openGraphImageContentType).toBe("image/png");
    expect(openGraphImageAlt).toBe(`${SITE.name} — ${SOCIAL_IMAGE_IDENTITY.role}`);
  });
});

describe("localized work route static generation", () => {
  it("generates every project slug for both locales", () => {
    expect(generateProjectStaticParams()).toEqual(
      expect.arrayContaining([
        { locale: "en", slug: SLUG },
        { locale: "id", slug: SLUG },
      ]),
    );
    expect(generateProjectStaticParams()).toHaveLength(
      getSelectedProjectSlugs().length * routing.locales.length,
    );
  });

  it("generates the archive for both locales", () => {
    expect(generateArchiveStaticParams()).toEqual([{ locale: "en" }, { locale: "id" }]);
  });
});

describe.each([
  ["en", `/work/${SLUG}`, "en_US"],
  ["id", `/id/work/${SLUG}`, "id_ID"],
] as const)("%s first app metadata", (locale, pathname, openGraphLocale) => {
  it("uses localized copy, canonical, language alternates, and shared social image", () => {
    const messages = getMessages(locale);
    const metadata = generateProjectMetadata({ params: { locale, slug: SLUG } });
    const project = (messages.projects.selected as Record<string, { descriptor: string; outcome: string }>)[SLUG];
    const title = messages.common.labels.caseStudyMetadataTitle.replace("{projectName}", getProject(SLUG, locale)!.name);
    const description = `${project.descriptor}. ${project.outcome}`;

    expect(metadata).toMatchObject({
      title,
      description,
      alternates: {
        canonical: absolute(pathname),
        languages: {
          en: absolute(`/work/${SLUG}`),
          id: absolute(`/id/work/${SLUG}`),
        },
      },
      openGraph: {
        type: "article",
        locale: openGraphLocale,
        title,
        description,
        url: absolute(pathname),
        images: [{ url: absolute("/opengraph-image") }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [{ url: absolute("/opengraph-image") }],
      },
    });
  });
});

describe.each([
  ["en", "/work/archive", "en_US"],
  ["id", "/id/work/archive", "id_ID"],
] as const)("%s archive metadata", (locale, pathname, openGraphLocale) => {
  it("uses localized copy, canonical, language alternates, and shared social image", () => {
    const common = getMessages(locale).common;
    const title = common.labels.projectArchiveMetadataTitle;
    const description = common.labels.projectArchiveMetadataDescription.replace(
      "{name}",
      SITE.name,
    );
    const metadata = generateArchiveMetadata({ params: { locale } });

    expect(metadata).toMatchObject({
      title,
      description,
      alternates: {
        canonical: absolute(pathname),
        languages: {
          en: absolute("/work/archive"),
          id: absolute("/id/work/archive"),
        },
      },
      openGraph: {
        type: "website",
        locale: openGraphLocale,
        title,
        description,
        url: absolute(pathname),
        images: [{ url: absolute("/opengraph-image") }],
      },
    });
  });
});

describe.each(["en", "id"] as const)("localized %s work markup", (locale) => {
  it("renders localized case-study and archive copy with locale-aware links", async () => {
    const common = getMessages(locale).common;
    const prefix = locale === "en" ? "" : "/id";
    const project = await ProjectPage({ params: { locale, slug: SLUG } });
    const archive = await ArchivePage({ params: { locale } });
    const projectHtml = renderToStaticMarkup(project);
    const archiveHtml = renderToStaticMarkup(archive);
    const projectText = visibleText(project);
    const archiveText = visibleText(archive);

    expect(projectText).toContain(common.actions.backToSelectedWork);
    expect(projectText).toContain(common.caseStudy.sections.overview);
    expect(projectText).toContain(common.caseStudy.sections.stack);
    expect(projectText).toContain(common.caseStudy.relatedWork);
    expect(projectHtml).toContain(`href="${prefix || "/"}#apps"`);
    expect(projectHtml).toContain(`href="${prefix}/work/archive"`);

    expect(archiveText).toContain(common.sections.archive.title);
    expect(archiveText).toContain(common.sections.archive.description);
    expect(archiveText).toContain(common.actions.repository);
    expect(archiveHtml).toContain(`href="${prefix || "/"}#apps"`);
  });
});

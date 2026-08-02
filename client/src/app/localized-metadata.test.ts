import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
// The shell layout now owns the fonts, and next/font only runs inside the compiler.
vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "--font-sans" }),
  IBM_Plex_Mono: () => ({ variable: "--font-mono" }),
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
import { getMessages } from "@/i18n/messages";
import { SITE } from "@/lib/site";

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
    const title = labels.siteMetadataTitle.replace("{name}", "Marco Abel Zefanya");
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
    expect(openGraphImageAlt).toBe("Marco Abel Zefanya — Full-Stack Engineer");
  });
});

describe("localized work route static generation", () => {
  it("generates all five project slugs for both locales", () => {
    expect(generateProjectStaticParams()).toEqual(
      expect.arrayContaining([
        { locale: "en", slug: "satellyte" },
        { locale: "id", slug: "satellyte" },
      ]),
    );
    expect(generateProjectStaticParams()).toHaveLength(10);
  });

  it("generates the archive for both locales", () => {
    expect(generateArchiveStaticParams()).toEqual([{ locale: "en" }, { locale: "id" }]);
  });
});

describe.each([
  ["en", "/work/satellyte", "en_US"],
  ["id", "/id/work/satellyte", "id_ID"],
] as const)("%s Satellyte metadata", (locale, pathname, openGraphLocale) => {
  it("uses localized copy, canonical, language alternates, and shared social image", () => {
    const messages = getMessages(locale);
    const metadata = generateProjectMetadata({ params: { locale, slug: "satellyte" } });
    const project = messages.projects.selected.satellyte;
    const title = messages.common.labels.caseStudyMetadataTitle.replace("{projectName}", "Satellyte");
    const description = `${project.descriptor}. ${project.outcome}`;

    expect(metadata).toMatchObject({
      title,
      description,
      alternates: {
        canonical: absolute(pathname),
        languages: {
          en: absolute("/work/satellyte"),
          id: absolute("/id/work/satellyte"),
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
      "Marco Abel Zefanya",
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
    const project = await ProjectPage({ params: { locale, slug: "satellyte" } });
    const archive = await ArchivePage({ params: { locale } });
    const projectHtml = renderToStaticMarkup(project);
    const archiveHtml = renderToStaticMarkup(archive);
    const projectText = visibleText(project);
    const archiveText = visibleText(archive);

    expect(projectText).toContain(common.actions.backToSelectedWork);
    expect(projectText).toContain(common.caseStudy.sections.overview);
    expect(projectText).toContain(common.caseStudy.sections.stack);
    expect(projectText).toContain(common.caseStudy.relatedWork);
    expect(projectHtml).toContain(`href="${prefix || "/"}#work"`);
    expect(projectHtml).toContain(`href="${prefix}/work/archive"`);

    expect(archiveText).toContain(common.sections.archive.title);
    expect(archiveText).toContain(common.sections.archive.description);
    expect(archiveText).toContain(common.actions.repository);
    expect(archiveHtml).toContain(`href="${prefix || "/"}#work"`);
  });
});

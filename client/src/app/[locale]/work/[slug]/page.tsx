import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CaseStudy } from "@/components/work/CaseStudy";
import { getProject, getSelectedProjects } from "@/data/projects";
import { isLocale, languageAlternates, localizePath } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { getContentFiles } from "@/lib/content/load";
import { resolveTechTag } from "@/lib/icons";
import { SITE } from "@/lib/site";
import { getSharedSocialImage } from "@/lib/social-image";

type Props = {
  params: { locale: string; slug: string };
};

export const dynamicParams = false;

export function generateStaticParams(): Props["params"][] {
  return routing.locales.flatMap((locale) =>
    getSelectedProjects(locale).map(({ slug }) => ({ locale, slug })),
  );
}

function formatMessage(message: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    message,
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const { locale, slug } = params;
  if (!isLocale(locale)) notFound();

  const project = getProject(slug, locale);
  if (!project) notFound();

  const common = getMessages(locale).common;
  const title = formatMessage(common.labels.caseStudyMetadataTitle, {
    projectName: project.name,
  });
  const description = `${project.descriptor}. ${project.outcome}`;
  const pathname = localizePath(`/work/${project.slug}`, locale);
  const canonicalUrl = new URL(pathname, SITE.url).href;
  const languagePaths = languageAlternates(`/work/${project.slug}`);
  const sharedImage = getSharedSocialImage(SITE.url);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: new URL(languagePaths.en, SITE.url).href,
        id: new URL(languagePaths.id, SITE.url).href,
      },
    },
    openGraph: {
      type: "article",
      locale: locale === "en" ? "en_US" : "id_ID",
      title,
      description,
      url: canonicalUrl,
      images: [sharedImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [sharedImage],
    },
  };
}

export default function ProjectPage({ params: { locale, slug } }: Props) {
  if (!isLocale(locale)) notFound();

  const project = getProject(slug, locale);
  if (!project) notFound();

  setRequestLocale(locale);

  const common = getMessages(locale).common;
  const { skillIcons } = getContentFiles().portfolio;
  return (
    <CaseStudy
      project={project}
      stack={project.stack.map((name) => resolveTechTag(name, skillIcons))}
      links={{
        selectedWork: localizePath("/#apps", locale),
        archive: localizePath("/work/archive", locale),
      }}
      labels={{
        backToSelectedWork: common.actions.backToSelectedWork,
        context: common.caseStudy.context,
        role: common.caseStudy.role,
        availability: common.labels.availability,
        liveProduct: common.actions.liveProduct,
        privateProductionSystem: common.labels.privateProductionSystem,
        openLiveProduct: formatMessage(common.accessibility.openLiveProduct, {
          projectName: project.name,
        }),
        newTabLabel: common.accessibility.opensInNewTab,
        sanitizedVisual: common.labels.sanitizedVisual,
        sanitizedVisualDescription: common.labels.sanitizedVisualDescription,
        enlargeScreenshot: common.accessibility.enlargeScreenshot,
        closeScreenshot: common.accessibility.closeScreenshot,
        projectHighlights: common.accessibility.projectHighlights,
        relatedWork: common.caseStudy.relatedWork,
        browseEarlierProjects: common.actions.browseEarlierProjects,
        sections: common.caseStudy.sections,
      }}
    />
  );
}

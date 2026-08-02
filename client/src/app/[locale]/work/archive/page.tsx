import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { ArchiveCard } from "@/components/work/ArchiveCard";
import { getArchiveProjects } from "@/data/projects";
import { isLocale, languageAlternates, localizePath } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";
import { getSharedSocialImage } from "@/lib/social-image";

type Props = {
  params: { locale: string };
};

export const dynamicParams = false;

export function generateStaticParams(): Props["params"][] {
  return routing.locales.map((locale) => ({ locale }));
}

function formatMessage(message: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    message,
  );
}

export function generateMetadata({ params: { locale } }: Props): Metadata {
  if (!isLocale(locale)) notFound();

  const common = getMessages(locale).common;
  const title = common.labels.projectArchiveMetadataTitle;
  const description = formatMessage(common.labels.projectArchiveMetadataDescription, {
    name: SITE.name,
  });
  const pathname = localizePath("/work/archive", locale);
  const canonicalUrl = new URL(pathname, SITE.url).href;
  const languagePaths = languageAlternates("/work/archive");
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
      title,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "id_ID",
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

export default function ProjectArchivePage({ params: { locale } }: Props) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const projects = getArchiveProjects(locale);
  const common = getMessages(locale).common;

  return (
    <section className="pb-20 pt-8 sm:pb-24 sm:pt-10 lg:pb-32 lg:pt-14" aria-labelledby="archive-heading">
      <Container>
        <Link
          className="inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-muted underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
          href={localizePath("/#work", locale)}
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {common.actions.backToSelectedWork}
        </Link>

        <header className="mt-10 max-w-3xl sm:mt-14 lg:mt-20">
          <p className="eyebrow">{common.sections.archive.eyebrow}</p>
          <h1
            id="archive-heading"
            className="text-balance mt-4 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl lg:text-6xl"
          >
            {common.sections.archive.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            {common.sections.archive.description}
          </p>
        </header>

        <div className="mt-12 grid min-w-0 gap-6 sm:grid-cols-2 sm:gap-8 lg:mt-16 lg:grid-cols-3">
          {projects.map((project) => (
            <ArchiveCard
              key={project.name}
              project={project}
              labels={{
                technologyStack: common.accessibility.technologyStack,
                repository: common.actions.repository,
                repositoryUnavailable: common.labels.repositoryUnavailable,
                openRepository: formatMessage(common.accessibility.openRepository, {
                  projectName: project.name,
                }),
                newTabLabel: common.accessibility.opensInNewTab,
              }}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

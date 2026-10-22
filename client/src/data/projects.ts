import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/locale";
import { getContentFiles } from "@/lib/content/load";
import type {
  ArchiveProject,
  CaseStudyContent,
  SelectedProject,
  SelectedProjectSlug,
} from "@/types/portfolio";

export function getSelectedProjectSlugs(): readonly SelectedProjectSlug[] {
  return getContentFiles().projects.selected.map(({ slug }) => slug);
}

const copyCaseStudy = (caseStudy: CaseStudyContent): CaseStudyContent => ({
  overview: [...caseStudy.overview],
  features: [...caseStudy.features],
  responsibilities: [...caseStudy.responsibilities],
});

type SelectedCopy = {
  readonly descriptor: string;
  readonly contextLabel: string;
  readonly role: string;
  readonly outcome: string;
  readonly highlights: readonly string[];
  readonly cover: { readonly alt: string };
  readonly screenshots?: readonly string[];
  readonly caseStudy: CaseStudyContent;
};

type ArchiveCopy = {
  readonly descriptor: string;
  readonly contextLabel: string;
  readonly coverAlt: string;
};

// Only projects cleared for public screenshots have any; the rest fall back to
// the sanitized cover. Captions live in the catalogs and pair by index.
export function getSelectedProjects(locale: Locale): readonly SelectedProject[] {
  // Validation guarantees every fact has its copy, so the lookups below cannot miss.
  const copy = getMessages(locale).projects.selected as Record<string, SelectedCopy>;

  return getContentFiles().projects.selected.map((fact): SelectedProject => {
    const localized = copy[fact.slug];
    const cover = fact.cover.kind === "image"
      ? { kind: "image" as const, src: fact.cover.src, width: fact.cover.width, height: fact.cover.height, alt: localized.cover.alt }
      : { kind: "abstract" as const, variant: fact.cover.variant, alt: localized.cover.alt };
    const captions = localized.screenshots ?? [];
    const screenshots = fact.screenshots.map(({ src, width, height }, index) => ({
      src,
      width,
      height,
      alt: captions[index] ?? localized.cover.alt,
    }));
    const localizedFields = {
      descriptor: localized.descriptor,
      contextLabel: localized.contextLabel,
      role: localized.role,
      outcome: localized.outcome,
      highlights: [...localized.highlights],
      screenshots,
      caseStudy: copyCaseStudy(localized.caseStudy),
    };

    // A public app without a live URL stays public and simply has no Live link; it is
    // never quietly turned into a private card.
    if (fact.privacy === "public") {
      return {
        slug: fact.slug,
        contextId: fact.contextId,
        name: fact.name,
        stack: [...fact.stack],
        privacy: "public",
        ...(fact.liveUrl ? { liveUrl: fact.liveUrl as `https://${string}` } : {}),
        cover,
        ...localizedFields,
      };
    }

    return {
      slug: fact.slug,
      contextId: fact.contextId,
      name: fact.name,
      stack: [...fact.stack],
      privacy: "private",
      cover,
      ...localizedFields,
    };
  });
}

export function getArchiveProjects(locale: Locale): readonly ArchiveProject[] {
  const copy = getMessages(locale).projects.archive as Record<string, ArchiveCopy>;

  return getContentFiles().projects.archive.map((fact): ArchiveProject => {
    const localized = copy[fact.id];
    const project = {
      id: fact.id,
      contextId: fact.contextId,
      name: fact.name,
      descriptor: localized.descriptor,
      contextLabel: localized.contextLabel,
      stack: [...fact.stack],
      cover: { src: fact.cover.src, alt: localized.coverAlt },
    };

    return fact.repositoryUrl
      ? { ...project, repositoryUrl: fact.repositoryUrl as `https://github.com/${string}` }
      : project;
  });
}

export function getProject(slug: string, locale: Locale): SelectedProject | undefined {
  return getSelectedProjects(locale).find((project) => project.slug === slug);
}

export type { SelectedProjectSlug };

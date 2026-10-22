import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { TechChip } from "@/components/ui/TechChip";
import { ProjectCover } from "@/components/work/ProjectCover";
import { ScreenshotGallery } from "@/components/work/ScreenshotGallery";
import type { TechTag } from "@/lib/content/models";
import type { SelectedProject } from "@/types/portfolio";

type CaseStudyProps = {
  project: SelectedProject;
  /** Resolved on the server (the icon lookup is server-only), in the project's own order. */
  stack: readonly TechTag[];
  links: {
    selectedWork: string;
    archive: string;
  };
  labels: {
    backToSelectedWork: string;
    context: string;
    role: string;
    availability: string;
    liveProduct: string;
    privateProductionSystem: string;
    openLiveProduct: string;
    newTabLabel: string;
    sanitizedVisual: string;
    sanitizedVisualDescription: string;
    enlargeScreenshot: string;
    closeScreenshot: string;
    projectHighlights: string;
    relatedWork: string;
    browseEarlierProjects: string;
    sections: {
      overview: string;
      features: string;
      role: string;
      stack: string;
      screenshots: string;
    };
  };
};

const SECTION_CLASS =
  "grid gap-5 border-t border-line pt-8 sm:pt-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12";
const SECTION_TITLE_CLASS = "font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted";

function NarrativeSection({
  id,
  title,
  paragraphs,
}: {
  id: string;
  title: string;
  paragraphs: readonly string[];
}) {
  return (
    <section aria-labelledby={id} className={SECTION_CLASS}>
      <h2 id={id} className={SECTION_TITLE_CLASS}>
        {title}
      </h2>
      <div className="max-w-3xl space-y-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

function ListSection({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: readonly string[];
}) {
  return (
    <section aria-labelledby={id} className={SECTION_CLASS}>
      <h2 id={id} className={SECTION_TITLE_CLASS}>
        {title}
      </h2>
      <ul className="max-w-3xl space-y-4" role="list">
        {items.map((item) => (
          <li
            key={item}
            className="flex min-w-0 gap-4 text-base leading-7 text-muted sm:text-lg sm:leading-8"
          >
            <span
              aria-hidden="true"
              className="mt-[0.78rem] size-1.5 shrink-0 rounded-full bg-accent sm:mt-[0.9rem]"
            />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CaseStudy({ project, stack, links, labels }: CaseStudyProps) {
  const headingPrefix = `case-study-${project.slug}`;

  return (
    <article className="pb-20 pt-8 sm:pb-24 sm:pt-10 lg:pb-32 lg:pt-14">
      <Container>
        <Link
          className="inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-muted underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
          href={links.selectedWork}
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {labels.backToSelectedWork}
        </Link>

        <header className="mt-10 border-b border-line pb-12 sm:mt-14 sm:pb-16 lg:mt-20 lg:pb-20">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            <span className="sr-only">{labels.context}: </span>
            {project.contextLabel}
            <span aria-hidden="true" className="mx-2 text-line">
              /
            </span>
            <span className="sr-only">{labels.role}: </span>
            {project.role}
          </p>

          <div className="mt-6 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-16">
            <div className="min-w-0">
              <h1 className="text-balance break-words font-display text-[clamp(44px,8vw,112px)] font-semibold leading-[0.95] tracking-[-0.05em] text-ink">
                {project.name}
              </h1>
              <p className="mt-5 font-display text-xl font-semibold tracking-[-0.02em] text-accent sm:text-2xl">
                {project.descriptor}
              </p>
              <p className="mt-6 max-w-3xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                {project.outcome}
              </p>
            </div>

            {project.liveUrl || project.privacy === "private" ? (
            <div className="border-l-2 border-accent pl-5">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted">
                {labels.availability}
              </p>
              {project.liveUrl ? (
                <ExternalLink
                  aria-label={labels.openLiveProduct}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
                  href={project.liveUrl}
                  newTabLabel={labels.newTabLabel}
                >
                  {labels.liveProduct}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                </ExternalLink>
              ) : project.privacy === "private" ? (
                <p className="mt-3 text-sm font-semibold text-ink">
                  {labels.privateProductionSystem}
                </p>
              ) : null}
            </div>
            ) : null}
          </div>
        </header>

        <ul
          aria-label={labels.projectHighlights}
          className="m-0 grid list-none gap-3 p-0 pt-8 sm:grid-cols-3 sm:pt-10"
          role="list"
        >
          {project.highlights.map((highlight, index) => (
            <li key={highlight} className="min-w-0">
              <Card className="flex h-full flex-col gap-4 p-5">
                <span aria-hidden="true" className="font-mono text-xs text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="break-words text-base leading-7 text-ink">{highlight}</span>
              </Card>
            </li>
          ))}
        </ul>

        <div className="space-y-10 pt-12 sm:space-y-12 sm:pt-16 lg:space-y-16 lg:pt-20">
          <NarrativeSection
            id={`${headingPrefix}-overview`}
            paragraphs={project.caseStudy.overview}
            title={labels.sections.overview}
          />

          <section
            aria-labelledby={`${headingPrefix}-stack`}
            className={SECTION_CLASS}
          >
            <h2 id={`${headingPrefix}-stack`} className={SECTION_TITLE_CLASS}>
              {labels.sections.stack}
            </h2>
            <ul className="m-0 flex max-w-3xl list-none flex-wrap gap-2 p-0" role="list">
              {stack.map((tag) => (
                <li key={tag.name}>
                  <TechChip tag={tag} size="sm" />
                </li>
              ))}
            </ul>
          </section>

          <ListSection
            id={`${headingPrefix}-features`}
            items={project.caseStudy.features}
            title={labels.sections.features}
          />
          <ListSection
            id={`${headingPrefix}-responsibilities`}
            items={project.caseStudy.responsibilities}
            title={labels.sections.role}
          />

          {project.screenshots.length > 0 ? (
            <section
              aria-labelledby={`${headingPrefix}-screenshots`}
              className="border-t border-line pt-8 sm:pt-10"
            >
              <h2
                id={`${headingPrefix}-screenshots`}
                className={SECTION_TITLE_CLASS}
              >
                {labels.sections.screenshots}
              </h2>
              <ScreenshotGallery
                screenshots={project.screenshots}
                labels={{
                  enlarge: labels.enlargeScreenshot,
                  close: labels.closeScreenshot,
                }}
              />
            </section>
          ) : (
            <section
              aria-labelledby={`${headingPrefix}-visual`}
              className="border-t border-line pt-8 sm:pt-10"
            >
              <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
                <h2
                  id={`${headingPrefix}-visual`}
                  className={SECTION_TITLE_CLASS}
                >
                  {labels.sanitizedVisual}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted">
                  {labels.sanitizedVisualDescription}
                </p>
              </div>
              <div className="relative mt-8 aspect-[4/3] min-h-56 overflow-hidden rounded-card border border-line bg-elevated sm:mt-10 lg:aspect-[2/1]">
                <ProjectCover
                  cover={project.cover}
                  label={project.privacy === "private" ? labels.privateProductionSystem : undefined}
                  sizes="(min-width: 1280px) 1200px, calc(100vw - 2.5rem)"
                />
              </div>
            </section>
          )}

          <nav
            aria-labelledby={`${headingPrefix}-related`}
            className="border-t border-line pt-8 sm:pt-10"
          >
            <h2 id={`${headingPrefix}-related`} className={SECTION_TITLE_CLASS}>
              {labels.relatedWork}
            </h2>
            <Link
              className="mt-4 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
              href={links.archive}
            >
              {labels.browseEarlierProjects}
              <ArrowUpRight
                aria-hidden="true"
                className="size-4"
                strokeWidth={1.75}
              />
            </Link>
          </nav>
        </div>
      </Container>
    </article>
  );
}

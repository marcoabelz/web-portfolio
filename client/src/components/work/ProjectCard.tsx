import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ExternalLink } from "@/components/ui/ExternalLink";
import { ProjectCover } from "@/components/work/ProjectCover";
import type { SelectedProject } from "@/types/portfolio";

type ProjectCardFields<Project> = Project extends unknown
  ? Omit<Project, "caseStudy" | "contextId" | "screenshots">
  : never;

export type ProjectCardProject = ProjectCardFields<SelectedProject>;

export type ProjectCardLabels = {
  readonly viewCaseStudy: string;
  readonly liveProduct: string;
  readonly privateProject: string;
  readonly projectHighlights: string;
  readonly technologyStack: string;
  readonly openLiveProduct: (projectName: string) => string;
  readonly newTabLabel: string;
  readonly coverLabels: Readonly<Record<
    Extract<ProjectCardProject["cover"], { kind: "abstract" }>["variant"],
    string
  >>;
};

type ProjectCardProps = {
  project: ProjectCardProject;
  caseStudyHref: string;
  labels: ProjectCardLabels;
  featured?: boolean;
};

export function ProjectCard({
  project,
  caseStudyHref,
  labels,
  featured = false,
}: ProjectCardProps) {
  const coverSizes = featured
    ? "(min-width: 1280px) 660px, (min-width: 1024px) 55vw, 100vw"
    : "(min-width: 1280px) 588px, (min-width: 1024px) 46vw, 100vw";

  return (
    <article
      className={`group min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-editorial ${
        featured ? "lg:grid lg:grid-cols-[1.15fr_0.85fr]" : "flex flex-col"
      }`}
    >
      <div
        className={`relative min-h-56 overflow-hidden border-b border-line bg-elevated ${
          featured ? "lg:min-h-[32rem] lg:border-b-0 lg:border-r" : "h-56"
        }`}
      >
        <ProjectCover
          cover={project.cover}
          label={project.cover.kind === "abstract" ? labels.coverLabels[project.cover.variant] : undefined}
          sizes={coverSizes}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-8">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.17em] text-muted">
          {project.contextLabel}
          <span aria-hidden="true" className="mx-2 text-line">
            /
          </span>
          {project.role}
        </p>

        <div className="mt-5 min-w-0">
          <h3 className="text-balance break-words text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
            {project.name}
          </h3>
          <p className="mt-2 text-sm font-semibold text-accent sm:text-base">
            {project.descriptor}
          </p>
        </div>

        <p className="mt-5 text-sm leading-7 text-muted sm:text-base">
          {project.outcome}
        </p>

        <ul className="mt-7 space-y-3 border-y border-line py-5" aria-label={labels.projectHighlights}>
          {project.highlights.map((highlight) => (
            <li key={highlight} className="flex min-w-0 gap-3 text-sm leading-6 text-ink">
              <span aria-hidden="true" className="mt-[0.58rem] size-1.5 shrink-0 bg-accent" />
              <span className="min-w-0 break-words">{highlight}</span>
            </li>
          ))}
        </ul>

        <ul
          aria-label={labels.technologyStack}
          className="mt-5 flex min-w-0 flex-wrap gap-x-4 gap-y-2 font-mono text-[0.6875rem] leading-5 text-muted"
        >
          {project.stack.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>

        <div
          className={`flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 ${
            featured ? "mt-8 pt-1" : "mt-auto pt-8"
          }`}
        >
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
            href={caseStudyHref}
          >
            {labels.viewCaseStudy}
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>

          {project.privacy === "public" ? (
            <ExternalLink
              aria-label={labels.openLiveProduct(project.name)}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted transition-colors duration-200 hover:text-accent"
              href={project.liveUrl}
              newTabLabel={labels.newTabLabel}
            >
              {labels.liveProduct}
              <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </ExternalLink>
          ) : (
            <span className="font-mono text-xs text-muted">{labels.privateProject}</span>
          )}
        </div>
      </div>
    </article>
  );
}

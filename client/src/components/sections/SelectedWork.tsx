import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  ProjectCard,
  type ProjectCardLabels,
  type ProjectCardProject,
} from "@/components/work/ProjectCard";

export type SelectedWorkProps = {
  readonly projects: readonly ProjectCardProject[];
  readonly archiveHref: string;
  readonly caseStudyHref: (slug: ProjectCardProject["slug"]) => string;
  readonly labels: ProjectCardLabels & {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly browseEarlierProjects: string;
  };
};

export function SelectedWork({
  projects: selectedProjects,
  archiveHref,
  caseStudyHref,
  labels,
}: SelectedWorkProps) {
  const [flagship, ...projects] = selectedProjects;

  if (!flagship) return null;

  return (
    <section
      id="work"
      className="section-space editorial-rule"
      aria-labelledby="work-heading"
    >
      <Container>
        <SectionHeading
          id="work-heading"
          eyebrow={labels.eyebrow}
          title={labels.title}
          description={labels.description}
        />

        <div className="mt-12">
          <ProjectCard
            project={flagship}
            caseStudyHref={caseStudyHref(flagship.slug)}
            labels={labels}
            featured
          />
        </div>

        <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              caseStudyHref={caseStudyHref(project.slug)}
              labels={labels}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-end border-t border-line pt-6">
          <Link
            href={archiveHref}
            className="inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
          >
            {labels.browseEarlierProjects}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
      </Container>
    </section>
  );
}

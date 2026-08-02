import Image from "next/image";
import { Github } from "lucide-react";

import { ExternalLink } from "@/components/ui/ExternalLink";
import type { ArchiveProject } from "@/types/portfolio";

type ArchiveCardProps = {
  project: ArchiveProject;
  labels: {
    technologyStack: string;
    repository: string;
    repositoryUnavailable: string;
    openRepository: string;
    newTabLabel: string;
  };
};

export function ArchiveCard({ project, labels }: ArchiveCardProps) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative aspect-[16/10] min-h-0 overflow-hidden border-b border-line bg-elevated">
        <Image
          fill
          alt={project.cover.alt}
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.015]"
          sizes="(min-width: 1280px) 384px, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw"
          src={project.cover.src}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.17em] text-muted">
          {project.contextLabel}
        </p>
        <h2 className="mt-3 break-words text-xl font-semibold tracking-[-0.025em] text-ink">
          {project.name}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">{project.descriptor}</p>

        <ul
          aria-label={labels.technologyStack}
          className="mt-5 flex min-w-0 flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 font-mono text-[0.6875rem] leading-5 text-muted"
        >
          {project.stack.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          {project.repositoryUrl ? (
            <ExternalLink
              aria-label={labels.openRepository}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
              href={project.repositoryUrl}
              newTabLabel={labels.newTabLabel}
            >
              <Github aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {labels.repository}
            </ExternalLink>
          ) : (
            <span className="font-mono text-xs text-muted">{labels.repositoryUnavailable}</span>
          )}
        </div>
      </div>
    </article>
  );
}

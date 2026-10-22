import { Github } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { SkeletonImage } from "@/components/ui/SkeletonImage";
import { TechChip } from "@/components/ui/TechChip";
import type { TechTag } from "@/lib/content/models";
import type { ArchiveProject } from "@/types/portfolio";

type ArchiveCardProps = {
  project: ArchiveProject;
  /** Resolved on the server (the icon lookup is server-only). */
  stack: readonly TechTag[];
  labels: {
    technologyStack: string;
    repository: string;
    repositoryUnavailable: string;
    openRepository: string;
    newTabLabel: string;
  };
};

// Archive covers are mixed sizes (some are tall full-page captures), so the box is fixed
// at 16:10 and the image is cropped to it, not stretched.
const COVER_WIDTH = 1600;
const COVER_HEIGHT = 1000;

export function ArchiveCard({ project, stack, labels }: ArchiveCardProps) {
  return (
    <Card as="article" interactive className="app-card">
      <div className="app-media">
        <SkeletonImage
          src={project.cover.src}
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          alt={project.cover.alt}
          sizes="(min-width: 1280px) 384px, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw"
          className="size-full"
        />
      </div>

      <div className="app-body">
        <p className="app-ctx">{project.contextLabel}</p>
        <h2 className="app-name">{project.name}</h2>
        <p className="app-outcome">{project.descriptor}</p>

        <ul aria-label={labels.technologyStack} className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
          {stack.map((tag) => (
            <li key={tag.name}>
              <TechChip tag={tag} size="sm" />
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          {project.repositoryUrl ? (
            <ExternalLink
              aria-label={labels.openRepository}
              className="app-go relative z-10"
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
    </Card>
  );
}

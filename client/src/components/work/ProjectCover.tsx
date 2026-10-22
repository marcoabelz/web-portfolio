import { Lock } from "lucide-react";

import { SkeletonImage } from "@/components/ui/SkeletonImage";
import type { AbstractCoverVariant, ProjectCover as ProjectCoverData } from "@/types/portfolio";

type ProjectCoverProps = {
  cover: ProjectCoverData;
  label?: string;
  priority?: boolean;
  sizes?: string;
};

// Full class names, so Tailwind sees them and keeps the rules.
const patternClass: Record<AbstractCoverVariant, string> = {
  signal: "cover-pattern-signal",
  vision: "cover-pattern-vision",
  talent: "cover-pattern-talent",
  telemetry: "cover-pattern-telemetry",
};

export function ProjectCover({
  cover,
  label,
  priority = false,
  sizes = "100vw",
}: ProjectCoverProps) {
  const chip = label ? (
    <span aria-hidden="true" className="cover-lock">
      <Lock aria-hidden="true" className="size-3" strokeWidth={1.75} />
      {label}
    </span>
  ) : null;

  if (cover.kind === "image") {
    return (
      <>
        <SkeletonImage
          src={cover.src}
          width={cover.width}
          height={cover.height}
          alt={cover.alt}
          sizes={sizes}
          priority={priority}
          className="size-full"
        />
        {chip}
      </>
    );
  }

  // Sanitized on purpose: a glow and a line grid, coloured from the theme tokens,
  // with no product data in it. The lock chip labels it as a private system.
  return (
    <div
      aria-label={cover.alt}
      className={`cover-pattern ${patternClass[cover.variant]}`}
      role="img"
    >
      {chip}
    </div>
  );
}

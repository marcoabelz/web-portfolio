"use client";

import Image from "next/image";
import { useState } from "react";

type SkeletonImageProps = {
  src: string;
  width: number;
  height: number;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

// The wrapper reserves the aspect ratio (no layout shift) and shows a shimmer
// until the image has loaded; globals.css hides it on [data-loaded="true"].
// A failed image also settles the wrapper, so a broken file does not shimmer forever.
export function SkeletonImage({ src, width, height, alt, sizes, priority, className }: SkeletonImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <span
      className={`skeleton${className ? ` ${className}` : ""}`}
      data-loaded={state === "loading" ? "false" : "true"}
      data-error={state === "error" ? "true" : undefined}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        sizes={sizes}
        priority={priority}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className="skeleton-img"
      />
    </span>
  );
}

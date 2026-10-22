"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";

import { SkeletonImage } from "@/components/ui/SkeletonImage";
import type { ProjectScreenshot } from "@/types/portfolio";

// Each screenshot carries the size stored with it in content/projects.json, so the row
// and the dialog reserve the right box before the file decodes, whatever its shape.

// The widest box at the screenshot's own ratio that fits inside 95vw x 90vh.
export function dialogImageWidth({ width, height }: Readonly<{ width: number; height: number }>): string {
  const ratio = Math.round((width / height) * 10_000) / 10_000;

  return `min(95vw, calc(90vh * ${ratio}))`;
}

// A slide is at most 42rem wide and at most SLIDE_MAX_HEIGHT_REM tall at the
// screenshot's own ratio, so a phone screenshot (390x844) stays a phone-sized card instead
// of a 42rem-wide column several screens tall. A landscape screenshot is limited by width.
const SLIDE_MAX_WIDTH_REM = 42;
const SLIDE_MAX_HEIGHT_REM = 36;

// The slide's width cap in rem for this screenshot: the full width for landscape shots,
// less for anything taller than SLIDE_MAX_WIDTH_REM x SLIDE_MAX_HEIGHT_REM allows.
export function slideMaxWidthRem({ width, height }: Readonly<{ width: number; height: number }>): number {
  const byHeight = (SLIDE_MAX_HEIGHT_REM * width) / height;

  return Math.round(Math.min(SLIDE_MAX_WIDTH_REM, byHeight) * 100) / 100;
}

export type ScreenshotGalleryProps = {
  readonly screenshots: readonly ProjectScreenshot[];
  readonly labels: {
    readonly enlarge: string;
    readonly close: string;
  };
};

export function ScreenshotGallery({ screenshots, labels }: ScreenshotGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<ProjectScreenshot | null>(null);

  // showModal has to wait for the picture to be in the tree, otherwise the dialog
  // paints one empty frame before React commits the state change.
  useEffect(() => {
    if (active) dialogRef.current?.showModal();
  }, [active]);

  return (
    <>
      <ul
        className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 sm:mt-10"
        role="list"
      >
        {/* A slide stops short of the full width so the next one peeks in: a touch
            device hides the scrollbar, and without that edge the row looks static. */}
        {screenshots.map((screenshot) => {
          const maxWidth = slideMaxWidthRem(screenshot);

          return (
            <li
              key={screenshot.src}
              className="w-[min(85%,var(--slide-max))] shrink-0 snap-start sm:w-[min(100%,var(--slide-max))]"
              style={{ "--slide-max": `${maxWidth}rem` } as CSSProperties}
            >
              <button
                type="button"
                onClick={() => setActive(screenshot)}
                aria-label={`${labels.enlarge}: ${screenshot.alt}`}
                className="group block w-full text-left"
              >
                <figure>
                  <div className="overflow-hidden rounded-card border border-line bg-elevated transition-colors duration-200 group-hover:border-accent group-focus-visible:border-accent motion-reduce:transition-none">
                    <SkeletonImage
                      src={screenshot.src}
                      alt={screenshot.alt}
                      width={screenshot.width}
                      height={screenshot.height}
                      sizes={`(min-width: 1024px) ${Math.round(maxWidth * 16)}px, min(calc(100vw - 2.5rem), ${Math.round(maxWidth * 16)}px)`}
                      className="w-full [&_.skeleton-img]:object-top"
                    />
                  </div>
                  <figcaption className="mt-3 text-sm leading-6 text-muted">
                    {screenshot.alt}
                  </figcaption>
                </figure>
              </button>
            </li>
          );
        })}
      </ul>

      {/* A modal <dialog> shrinks to fit its content, so a click that reports the dialog
          itself as the target came from the backdrop. Escape is handled by the browser. */}
      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/80"
      >
        {active ? (
          <div className="relative">
            {/* The wrapper takes the width the screenshot's own box allows inside 95vw x
                90vh, so the skeleton holds the right shape while the full-size file loads. */}
            <div style={{ width: dialogImageWidth(active) }}>
              <SkeletonImage
                src={active.src}
                alt={active.alt}
                width={active.width}
                height={active.height}
                sizes="95vw"
                className="w-full rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={labels.close}
              className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 motion-reduce:transition-none"
            >
              <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

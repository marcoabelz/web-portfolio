"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import type { ProjectScreenshot } from "@/types/portfolio";

// Every published screenshot is exported at 1920x1200, so the dialog can reserve the
// right box before the full-size file decodes.
const SCREENSHOT_WIDTH = 1920;
const SCREENSHOT_HEIGHT = 1200;

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
        {screenshots.map((screenshot) => (
          <li key={screenshot.src} className="w-[min(100%,42rem)] shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setActive(screenshot)}
              aria-label={`${labels.enlarge}: ${screenshot.alt}`}
              className="group block w-full text-left"
            >
              <figure>
                <div className="relative aspect-[8/5] overflow-hidden rounded-2xl border border-line bg-elevated shadow-editorial transition-colors duration-200 group-hover:border-accent group-focus-visible:border-accent motion-reduce:transition-none">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    sizes="(min-width: 1024px) 672px, calc(100vw - 2.5rem)"
                    className="object-cover object-top"
                  />
                </div>
                <figcaption className="mt-3 text-sm leading-6 text-muted">
                  {screenshot.alt}
                </figcaption>
              </figure>
            </button>
          </li>
        ))}
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
            <Image
              src={active.src}
              alt={active.alt}
              width={SCREENSHOT_WIDTH}
              height={SCREENSHOT_HEIGHT}
              className="h-auto max-h-[90vh] w-auto max-w-[95vw] rounded-lg object-contain"
            />
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

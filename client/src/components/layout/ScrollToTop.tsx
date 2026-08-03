"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export function getScrollBehavior(prefersReducedMotion: boolean): ScrollBehavior {
  return prefersReducedMotion ? "auto" : "smooth";
}

export function ScrollToTop({ label }: { readonly label: string }) {
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) return;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mainContent = document.getElementById("main-content");

    mainContent?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: getScrollBehavior(prefersReducedMotion) });
  };

  return (
    <>
      <span ref={sentinelRef} className="pointer-events-none absolute left-0 top-0 size-px" aria-hidden="true" />
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={label}
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
        className={`fixed bottom-20 right-5 z-40 inline-flex size-11 items-center justify-center border border-line bg-surface text-ink shadow-lg transition-[opacity,transform,background-color,border-color,color] duration-300 hover:border-accent hover:bg-ink hover:text-canvas focus-visible:border-accent motion-reduce:transition-none md:bottom-24 md:right-8 ${
          isVisible
            ? "pointer-events-auto translate-y-0 scale-100 opacity-70 hover:opacity-100 focus-visible:opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <ArrowUp className="size-4" strokeWidth={1.8} aria-hidden="true" />
      </button>
    </>
  );
}

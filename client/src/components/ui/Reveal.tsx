"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";

export const REVEAL_OBSERVER_OPTIONS = {
  threshold: 0.12,
  rootMargin: "0px 0px -8% 0px",
} as const;

type RevealState = "idle" | "ready" | "visible";

export function Reveal({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("idle");

  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      setState("visible");
      return;
    }

    setState("ready");

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;

      setState("visible");
      observer.disconnect();
    }, REVEAL_OBSERVER_OPTIONS);

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const stateClass = state === "idle" ? "" : state === "ready" ? " reveal-ready" : " reveal-ready reveal-visible";

  return (
    <div ref={elementRef} className={`reveal-section${stateClass}`}>
      {children}
    </div>
  );
}

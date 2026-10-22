import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/Container";
import type { HeroModel } from "@/data/home";

const BUTTON =
  "inline-flex h-12 items-center gap-2.5 rounded-full px-[22px] text-sm font-medium transition-[transform,background-color,color,border-color] duration-300 hover:-translate-y-0.5";

// The name stays one string in the data; it is split on spaces here so each word can
// rise on load and the word equal to the nickname can take the accent colour.
export function Hero({ model }: { model: HeroModel }) {
  const { name, nickname, intro, actions } = model;
  const words = name.split(/\s+/).filter(Boolean);

  return (
    <section className="pb-6 pt-8 sm:pt-10 lg:pb-10 lg:pt-14" aria-labelledby="hero-heading">
      <Container>
        <h1 id="hero-heading" className="hero-name">
          {words.map((word, index) => (
            <span key={`${word}-${index}`}>
              {index > 0 ? " " : null}
              <span className="hero-word">
                <span
                  className={`hero-word-in${word === nickname ? " text-accent" : ""}`}
                  style={{ animationDelay: `${100 + index * 80}ms` }}
                >
                  {word}
                </span>
              </span>
            </span>
          ))}
        </h1>

        <div className="mt-6 grid gap-7 sm:mt-8 lg:mt-11 lg:grid-cols-[1fr_auto] lg:items-end">
          <p className="m-0 max-w-[34ch] font-display text-[clamp(21px,2.1vw,34px)] font-medium leading-[1.25] tracking-[-0.02em]">
            {intro.lead} <span className="text-muted">{intro.tail}</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={actions.apps.href} className={`${BUTTON} bg-ink text-canvas hover:bg-accent`}>
              {actions.apps.label}
              <ArrowDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </Link>
            <Link
              href={actions.project.href}
              className={`${BUTTON} border border-line hover:border-ink`}
            >
              {actions.project.label}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </Link>
            <a
              href={actions.resume.href}
              download
              className="ml-1.5 inline-flex min-h-11 items-center border-b border-line text-sm text-muted transition-colors duration-200 hover:border-ink hover:text-ink"
            >
              {actions.resume.label}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Download } from "lucide-react";

import profilePicture from "@/assets/profile_pict.jpg";
import { Container } from "@/components/ui/Container";

export type HeroProps = {
  readonly profile: {
    readonly name: string;
    readonly nickname: string;
    readonly title: string;
    readonly specialty: string;
    readonly resumePath: string;
  };
  readonly facts: readonly string[];
  readonly paragraphs: readonly string[];
  readonly links: {
    readonly work: string;
    readonly contact: string;
  };
  readonly labels: {
    readonly viewSelectedWork: string;
    readonly downloadResume: string;
    readonly getInTouch: string;
    readonly portraitAlt: string;
  };
};

export function Hero({ profile, facts, paragraphs, links, labels }: HeroProps) {
  // Highlight the nickname in place so the name stays one string in the data.
  const nameParts = profile.name.split(profile.nickname);

  return (
    <section
      className="section-space pt-14 sm:pt-20 lg:pt-24"
      aria-labelledby="hero-heading"
    >
      <Container className="grid items-center gap-14 lg:grid-cols-[1.12fr_0.88fr] lg:gap-20">
        <div className="min-w-0 lg:pb-12">
          <p className="eyebrow">{profile.title}</p>
          <h1
            id="hero-heading"
            className="text-balance mt-5 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
          >
            {nameParts.map((part, index) => (
              <span key={`${part}-${index}`}>
                {index > 0 ? (
                  <span className="text-accent">{profile.nickname}</span>
                ) : null}
                {part}
              </span>
            ))}
          </h1>
          {/* <p className="mt-6 max-w-2xl text-xl font-semibold leading-snug tracking-[-0.02em] text-accent sm:text-2xl">
            {profile.specialty}
          </p> */}
          {/* Justified text opens rivers of whitespace in a phone-width column, so
              hyphenation carries it — the browser breaks words per the `lang` on <html>. */}
          <div className="min-w-0 mt-6 space-y-6 text-justify hyphens-auto text-base leading-8 text-muted sm:text-lg sm:leading-9">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {/* Stacked full-width on a phone: three side-by-side buttons wrap into
              ragged fragments once the labels are longer than a third of the screen. */}
          <div className="mt-9 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href={links.work}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-ink px-5 py-3 text-sm font-semibold text-canvas transition-colors duration-200 hover:bg-accent sm:w-auto"
            >
              {labels.viewSelectedWork}
              <ArrowDown
                aria-hidden="true"
                className="size-4"
                strokeWidth={1.75}
              />
            </Link>
            <a
              href={profile.resumePath}
              download
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent sm:w-auto"
            >
              {labels.downloadResume}
              <Download
                aria-hidden="true"
                className="size-4"
                strokeWidth={1.75}
              />
            </a>
            <Link
              href={links.contact}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-3 py-3 text-sm font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent sm:w-auto"
            >
              {labels.getInTouch}
              <ArrowRight
                aria-hidden="true"
                className="size-4"
                strokeWidth={1.75}
              />
            </Link>
          </div>
        </div>

        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem_0.5rem_2rem_0.5rem] bg-elevated lg:mx-0 lg:ml-auto lg:translate-y-8">
          <Image
            src={profilePicture}
            alt={labels.portraitAlt}
            fill
            priority
            sizes="(min-width: 640px) 448px, calc(100vw - 40px)"
            className="object-cover"
          />
        </div>
      </Container>
      <Container className="">
        {/* Three facts side by side on a phone shred into two-word columns, so they
            stack until there is room for the row. */}
        <ol className="flex flex-col gap-1 sm:flex-row sm:justify-between">
          {facts.map((fact) => (
            <li key={fact}>
              <span className="text-sm font-semibold leading-6 text-accent sm:text-base">
                {fact}
              </span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

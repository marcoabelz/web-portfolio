import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Experience as ExperienceContent } from "@/types/portfolio";

type ExperienceItem = Pick<
  ExperienceContent,
  | "company"
  | "title"
  | "location"
  | "start"
  | "end"
  | "startDate"
  | "endDate"
  | "summary"
  | "highlights"
  | "stack"
>;

export type ExperienceProps = {
  readonly experiences: readonly ExperienceItem[];
  readonly labels: {
    readonly eyebrow: string;
    readonly title: string;
    readonly technologyStack: (company: string) => string;
  };
};

export function Experience({ experiences, labels }: ExperienceProps) {
  return (
    <section
      id="experience"
      className="section-space editorial-rule"
      aria-labelledby="experience-heading"
    >
      <Container>
        <SectionHeading
          id="experience-heading"
          eyebrow={labels.eyebrow}
          title={labels.title}
        />

        <ol className="mt-14 ml-2 border-l border-line sm:ml-3">
          {experiences.map((experience) => (
            <li
              key={`${experience.company}-${experience.start}`}
              className="group relative pb-14 pl-7 last:pb-0 sm:pl-10"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[0.3125rem] top-2 size-2.5 bg-accent ring-4 ring-canvas"
              />
              <article className="grid min-w-0 gap-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="min-w-0 font-mono text-xs leading-6 text-muted">
                  <p>
                    <time dateTime={experience.startDate}>{experience.start}</time>
                    <span aria-hidden="true"> — </span>
                    {experience.endDate ? (
                      <time dateTime={experience.endDate}>{experience.end}</time>
                    ) : (
                      <span>{experience.end}</span>
                    )}
                  </p>
                  <p className="mt-1">{experience.location}</p>
                </div>

                <div className="min-w-0 border-b border-line pb-14 group-last:border-b-0 group-last:pb-0">
                  <h3 className="text-balance text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                    {experience.title}
                  </h3>
                  <p className="mt-2 font-semibold text-accent">{experience.company}</p>
                  <p className="mt-5 max-w-3xl text-base leading-7 text-muted sm:text-justify">
                    {experience.summary}
                  </p>
                  <ul className="mt-6 max-w-3xl space-y-3">
                    {experience.highlights.map((highlight) => (
                      <li key={highlight} className="flex min-w-0 gap-3 text-sm leading-6 text-ink sm:text-base sm:leading-7">
                        <span aria-hidden="true" className="mt-[0.7rem] size-1.5 shrink-0 bg-accent" />
                        <span className="min-w-0">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <ul
                    aria-label={labels.technologyStack(experience.company)}
                    className="mt-6 flex min-w-0 max-w-3xl flex-wrap gap-x-4 gap-y-2 font-mono text-[0.6875rem] leading-5 text-muted"
                  >
                    {experience.stack.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

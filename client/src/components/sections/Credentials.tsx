import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Education, Language } from "@/types/portfolio";

export type CredentialsProps = {
  readonly education: readonly Education[];
  readonly languages: readonly Language[];
  readonly labels: {
    readonly eyebrow: string;
    readonly title: string;
    readonly education: string;
    readonly languages: string;
  };
};

export function Credentials({ education, languages, labels }: CredentialsProps) {
  return (
    <section className="section-space editorial-rule" aria-labelledby="credentials-heading">
      <Container>
        <SectionHeading
          id="credentials-heading"
          eyebrow={labels.eyebrow}
          title={labels.title}
        />

        <div className="mt-12 grid min-w-0 border-t border-line md:grid-cols-2">
          <div className="min-w-0 border-b border-line py-8 md:border-r md:pr-10 lg:pr-16">
            <h3 className="eyebrow text-muted">{labels.education}</h3>
            <div className="mt-7 space-y-8">
              {education.map((item) => (
                <article key={`${item.institution}-${item.program}`}>
                  <h4 className="text-xl font-semibold tracking-[-0.025em] text-ink">
                    {item.institution}
                  </h4>
                  <p className="mt-2 text-base leading-7 text-ink">{item.program}</p>
                  <p className="mt-2 font-mono text-xs leading-6 text-muted">{item.period}</p>
                  <p className="mt-2 text-sm font-semibold text-accent">{item.result}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="min-w-0 border-b border-line py-8 md:pl-10 lg:pl-16">
            <h3 className="eyebrow text-muted">{labels.languages}</h3>
            <div className="mt-7 space-y-8">
              {languages.map((language) => (
                <article key={language.name}>
                  <h4 className="text-xl font-semibold tracking-[-0.025em] text-ink">
                    {language.name}
                  </h4>
                  <p className="mt-2 text-base leading-7 text-ink">{language.proficiency}</p>
                  {"evidence" in language ? (
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                      {language.evidence}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { SkillGroup } from "@/types/portfolio";

export type SkillsProps = {
  readonly groups: readonly SkillGroup[];
  readonly labels: {
    readonly eyebrow: string;
    readonly title: string;
  };
};

export function Skills({ groups, labels }: SkillsProps) {
  return (
    <section id="skills" className="section-space editorial-rule" aria-labelledby="skills-heading">
      <Container>
        <SectionHeading
          id="skills-heading"
          eyebrow={labels.eyebrow}
          title={labels.title}
        />

        <div className="mt-12 grid border-l border-t border-line md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <article key={group.title} className="min-w-0 border-b border-r border-line p-6 sm:p-8">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink">
                {group.title}
              </h3>
              <p className="mt-4 break-words text-sm leading-7 text-muted sm:text-base">
                {group.skills.join(" · ")}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

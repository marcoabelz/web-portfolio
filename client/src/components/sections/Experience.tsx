import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ExperienceModel } from "@/data/home";

import { ExperienceRow } from "./ExperienceRow";

export function Experience({ model, number }: { model: ExperienceModel; number: string }) {
  return (
    <section id="experience" className="section-space editorial-rule" aria-labelledby="experience-heading">
      <Container>
        <SectionHeader id="experience-heading" number={number} title={model.title} description={model.description} />

        <ul className="exp-list">
          {model.rows.map((row) => (
            <ExperienceRow key={row.id} row={row} labels={model.labels} />
          ))}
        </ul>
      </Container>
    </section>
  );
}

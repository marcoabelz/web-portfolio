import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TechChip } from "@/components/ui/TechChip";
import type { StackModel } from "@/data/home";

export function Stack({ model, number }: { model: StackModel; number: string }) {
  return (
    <section id="stack" className="section-space editorial-rule" aria-labelledby="stack-heading">
      <Container>
        <SectionHeader id="stack-heading" number={number} title={model.title} description={model.description} />

        <ul className="stack-grid">
          {model.groups.map((group) => (
            <li key={group.id} className={`stack-item${group.wide ? " stack-wide" : ""}`}>
              <Card as="article" interactive className="stack-card" data-card="stack">
                <h3 className="stack-title">{group.title}</h3>
                <ul className="stack-chips">
                  {group.tags.map((tag) => (
                    <li key={tag.name} className="min-w-0">
                      <TechChip tag={tag} />
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

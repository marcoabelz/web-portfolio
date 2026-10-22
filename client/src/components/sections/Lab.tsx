import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TechChip } from "@/components/ui/TechChip";
import type { LabModel } from "@/data/home";

export function Lab({ model, number }: { model: LabModel; number: string }) {
  return (
    <section id="lab" className="section-space editorial-rule" aria-labelledby="lab-heading">
      <Container>
        <SectionHeader id="lab-heading" number={number} title={model.title} description={model.description} />

        <ul className="lab-grid">
          {model.items.map((item) => (
            <li key={item.id} className="lab-item">
              <Card as="article" interactive className="repo-card" data-card="repo">
                <h3 className="repo-name">
                  {/* The link's ::after covers the whole card, so the card is one click target. */}
                  <ExternalLink href={item.url} className="repo-link" newTabLabel={model.newTabLabel}>
                    <span>{item.name}</span>
                    <span aria-hidden="true">↗</span>
                  </ExternalLink>
                </h3>
                <p className="repo-desc">{item.description}</p>
                <ul className="repo-chips">
                  {item.stack.map((tag) => (
                    <li key={tag.name} className="min-w-0">
                      <TechChip tag={tag} size="sm" />
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

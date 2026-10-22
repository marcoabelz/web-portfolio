import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { AboutModel } from "@/data/home";

export function About({ model, number }: { model: AboutModel; number: string }) {
  return (
    <section id="about" className="section-space editorial-rule" aria-labelledby="about-heading">
      <Container>
        <SectionHeader id="about-heading" number={number} title={model.title} />

        <div className="about-grid">
          <div className="about-main">
            <p className="about-lead">{model.lead}</p>
            {model.paragraphs.length > 0 ? (
              <div className="about-cols">
                {model.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="about-para">{paragraph}</p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="about-cards">
            {model.cards.map((card) => (
              <Card key={`${card.label}-${card.title}`} as="article" className="about-card" data-card="about">
                <p className="about-card-label">{card.label}</p>
                <h3 className="about-card-title">{card.title}</h3>
                <p className="about-card-detail">{card.detail}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

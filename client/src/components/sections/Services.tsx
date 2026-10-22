import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ServicesModel } from "@/data/home";

const pad = (value: number) => String(value).padStart(2, "0");

export function Services({ model, number }: { model: ServicesModel; number: string }) {
  return (
    <section id="services" className="section-space editorial-rule" aria-labelledby="services-heading">
      <Container>
        <SectionHeader id="services-heading" number={number} title={model.title} description={model.description} />

        <ul className="services-grid">
          {model.items.map((item, index) => (
            <li key={item.id} className="services-item">
              <Card as="article" interactive className="service-card" data-card="service">
                <span className="service-no" aria-hidden="true">{pad(index + 1)}</span>
                <h3 className="service-title">{item.title}</h3>
                <p className="service-desc">{item.description}</p>
                <ul className="service-tags">
                  {item.tags.map((tag) => (
                    <li key={tag} className="chip chip-sm">
                      <span>{tag}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>

        <Card as="div" className="process-card" data-card="process">
          <h3 className="sr-only">{model.processLabel}</h3>
          <ol className="process-list">
            {model.steps.map((step, index) => (
              <li key={step.title} className="process-step">
                <span className="process-no">{model.stepLabel.replace("{number}", pad(index + 1))}</span>
                <h4 className="process-title">{step.title}</h4>
                <p className="process-desc">{step.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      </Container>
    </section>
  );
}

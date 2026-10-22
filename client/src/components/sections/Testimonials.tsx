import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { TestimonialsModel } from "@/data/home";

export function Testimonials({ model, number }: { model: TestimonialsModel; number: string }) {
  return (
    <section id="testimonials" className="section-space editorial-rule" aria-labelledby="testimonials-heading">
      <Container>
        <SectionHeader id="testimonials-heading" number={number} title={model.title} />

        <ul className="quote-grid">
          {model.items.map((item) => (
            <li key={item.id} className="quote-item">
              <Card as="div" className="quote-card" data-card="quote">
                <figure className="quote-figure">
                  <span className="quote-mark" aria-hidden="true">{"\u201C"}</span>
                  <blockquote className="quote-text">{item.quote}</blockquote>
                  <figcaption className="quote-by">
                    <span className="quote-name">{item.name}</span>
                    {item.role ? <span className="quote-role">{item.role}</span> : null}
                    {item.company ? <span className="quote-company">{item.company}</span> : null}
                  </figcaption>
                </figure>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

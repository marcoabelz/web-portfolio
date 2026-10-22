import { Fragment } from "react";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { ExternalLink } from "@/components/ui/ExternalLink";
import type { ContactAction, ContactModel } from "@/data/home";

const BUTTON =
  "inline-flex min-h-12 items-center gap-2.5 rounded-full px-[22px] text-sm font-medium transition-[transform,background-color,color,border-color] duration-300 hover:-translate-y-0.5";

export function Contact({ model, number }: { model: ContactModel; number: string }) {
  const { paths, socials, newTabLabel } = model;

  const renderAction = (action: ContactAction, solid: boolean) => {
    const className = `${BUTTON} ${solid ? "bg-ink text-canvas hover:bg-accent" : "border border-line hover:border-ink"}`;

    return action.external ? (
      <ExternalLink href={action.href} newTabLabel={newTabLabel} className={className}>
        {action.label}
        <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </ExternalLink>
    ) : (
      <a href={action.href} className={className}>
        {action.label}
      </a>
    );
  };

  return (
    <section id="contact" className="contact editorial-rule" aria-labelledby="contact-heading">
      <Container>
        <p className="section-header-no">
          ({number}) {model.label}
        </p>
        <h2 id="contact-heading" className="contact-title">
          {model.titleLead}
          <br />
          <span className="text-accent">{model.titleAccent}</span>
        </h2>

        <ul className="contact-paths">
          {paths.map((path) => (
            <li key={path.kind} className="flex min-w-0">
              <Card as="div" className="contact-path" data-card="path">
                <p className="contact-availability">
                  <span className="contact-dot" data-availability-dot aria-hidden="true" />
                  {model.availability}
                </p>
                <span className="contact-kind">{path.label}</span>
                <h3 className="contact-path-title">{path.title}</h3>
                <p className="contact-path-desc">{path.description}</p>
                <div className="contact-actions">
                  {path.actions.map((action, index) => (
                    <Fragment key={`${action.label}-${index}`}>
                      {renderAction(action, index === 0)}
                    </Fragment>
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <div className="contact-mail">
          <a href={`mailto:${model.email}`} className="contact-email">
            {model.email}
          </a>
          <ul className="contact-socials">
            {socials.map((social) => (
              <li key={social.id}>
                <ExternalLink
                  href={social.href}
                  newTabLabel={newTabLabel}
                  className="inline-flex min-h-11 items-center text-muted transition-colors duration-200 hover:text-ink"
                >
                  {social.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

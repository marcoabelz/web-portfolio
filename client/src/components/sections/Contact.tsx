import { ArrowUpRight, Github, Linkedin, Mail, MessageCircle, type LucideIcon } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { SocialLink } from "@/types/portfolio";

const SOCIAL_ICONS: Record<SocialLink["id"], LucideIcon> = {
  email: Mail,
  linkedIn: Linkedin,
  gitHub: Github,
  whatsApp: MessageCircle,
};

export type ContactProps = {
  readonly profile: {
    readonly name: string;
    readonly email: string;
    readonly availability: string;
    readonly location: string;
  };
  readonly socialLinks: readonly SocialLink[];
  readonly labels: {
    readonly eyebrow: string;
    readonly title: string;
    readonly basedIn: (location: string) => string;
    readonly contactOnSocial: (name: string, platform: string) => string;
    readonly newTabLabel: string;
  };
};

export function Contact({ profile, socialLinks, labels }: ContactProps) {
  return (
    <section id="contact" className="section-space editorial-rule" aria-labelledby="contact-heading">
      <Container>
        <SectionHeading
          id="contact-heading"
          eyebrow={labels.eyebrow}
          title={labels.title}
        />

        <div className="mt-12 grid min-w-0 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div className="min-w-0">
            <p className="max-w-2xl text-lg leading-8 text-muted sm:text-xl sm:leading-9">
              {profile.availability}
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-muted">
              {labels.basedIn(profile.location)}
            </p>
          </div>

          <ul className="min-w-0 border-t border-line">
            {socialLinks.map((social) => {
              const Icon = SOCIAL_ICONS[social.id];

              return (
                <li key={social.label} className="min-w-0 border-b border-line">
                  {social.external ? (
                    <ExternalLink
                      href={social.href}
                      aria-label={labels.contactOnSocial(profile.name, social.label)}
                      newTabLabel={labels.newTabLabel}
                      className="flex min-h-14 min-w-0 items-center justify-between gap-4 py-4 text-base font-semibold text-ink transition-colors duration-200 hover:text-accent"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon aria-hidden="true" className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
                        <span className="min-w-0">{social.label}</span>
                      </span>
                      <ArrowUpRight aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
                    </ExternalLink>
                  ) : (
                    <a
                      href={social.href}
                      className="flex min-h-14 min-w-0 items-center gap-3 py-4 text-base font-semibold text-ink transition-colors duration-200 hover:text-accent"
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
                      <span className="min-w-0 break-all">{profile.email}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}

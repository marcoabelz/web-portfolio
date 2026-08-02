import { Container } from "@/components/ui/Container";
import { ExternalLink } from "@/components/ui/ExternalLink";
import type { SocialLink } from "@/types/portfolio";

type SiteFooterProps = Readonly<{
  name: string;
  socialLinks: readonly SocialLink[];
  labels: Readonly<{
    copyright: string;
    socialLinks: string;
    email: string;
    social: string;
    opensInNewTab: string;
  }>;
}>;

export function SiteFooter({ name, socialLinks, labels }: SiteFooterProps) {
  const footerLinks = socialLinks.filter(({ id }) => id !== "whatsApp");

  return (
    <footer className="border-t border-line py-8">
      <Container className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {labels.copyright}
        </p>

        <nav aria-label={labels.socialLinks}>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {footerLinks.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <ExternalLink
                    href={link.href}
                    newTabLabel={labels.opensInNewTab}
                    className="inline-flex min-h-6 items-center py-1 text-sm font-semibold text-muted underline decoration-line underline-offset-4 transition-colors hover:text-accent"
                    aria-label={labels.social
                      .replace("{name}", name)
                      .replace("{platform}", link.label)}
                  >
                    {link.label}
                  </ExternalLink>
                ) : (
                  <a
                    href={link.href}
                    className="inline-flex min-h-6 items-center py-1 text-sm font-semibold text-muted underline decoration-line underline-offset-4 transition-colors hover:text-accent"
                    aria-label={labels.email.replace("{name}", name)}
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}

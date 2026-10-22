import { ArrowUp } from "lucide-react";

import { Container } from "@/components/ui/Container";

type SiteFooterProps = Readonly<{
  labels: Readonly<{
    copyright: string;
    backToTop: string;
  }>;
}>;

export function SiteFooter({ labels }: SiteFooterProps) {
  // The extra bottom padding on a phone keeps the last row out from under the fixed
  // chat and scroll-to-top buttons. The link is a plain anchor to the main landmark so
  // it works without script; the floating ScrollToTop button covers the long scroll.
  return (
    <footer className="border-t border-line pb-24 pt-6 sm:pb-8">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 font-mono text-xs text-muted">
        <p className="m-0 min-w-0 [overflow-wrap:anywhere]">{labels.copyright}</p>
        <a
          href="#main-content"
          className="inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-ink"
        >
          {labels.backToTop}
          <ArrowUp aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
        </a>
      </Container>
    </footer>
  );
}

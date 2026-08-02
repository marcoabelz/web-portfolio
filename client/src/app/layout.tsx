import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SITE } from "@/lib/site";

// The metadata routes outside [locale] resolve their image URLs against this.
export const metadata: Metadata = { metadataBase: new URL(SITE.url) };

// Passthrough only: Next needs a root layout for the metadata routes that sit
// outside [locale] (sitemap, robots, opengraph-image). The real shell — <html>,
// header, footer — lives in [locale]/layout.tsx, because Next reuses a layout
// whose segments did not change, so the locale param has to be part of the
// segment for a language switch to re-render it.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return children;
}

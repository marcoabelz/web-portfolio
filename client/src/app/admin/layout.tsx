import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import "../globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Content editor",
  robots: { index: false, follow: false },
};

// /admin sits outside [locale] deliberately: it is not translated, not indexed, and
// must not inherit the marketing shell. The root layout is a passthrough, so this
// segment owns its own <html>. No ThemeScript — the editor stays on the light
// palette :root already defines, so there is no pre-paint flash to guard against.
export default function AdminLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}

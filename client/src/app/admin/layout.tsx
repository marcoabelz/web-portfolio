import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { ThemeScript } from "@/components/layout/ThemeScript";

import "../globals.css";

const display = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["600"],
});

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Content editor",
  robots: { index: false, follow: false },
};

// /admin sits outside [locale] deliberately: it is not translated, not indexed, and
// must not inherit the marketing shell. The root layout is a passthrough, so this
// segment owns its own <html>. It shares the site's theme: ThemeScript sets data-theme
// before paint (dark unless light was chosen), hence suppressHydrationWarning.
export default function AdminLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}

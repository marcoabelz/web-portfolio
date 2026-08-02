import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { getPortfolioContent } from "@/data/portfolio";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("SiteFooter", () => {
  it("uses stable social IDs and announces external tabs in the active language", () => {
    const portfolio = getPortfolioContent("id");
    const socialLinks = portfolio.socialLinks.map((link) =>
      link.id === "whatsApp" ? { ...link, label: "Pesan instan" as "WhatsApp" } : link,
    );
    const html = renderToStaticMarkup(React.createElement(SiteFooter, {
      name: portfolio.profile.name,
      socialLinks,
      labels: {
        copyright: `© 2026 ${portfolio.profile.name}`,
        socialLinks: "Tautan media sosial",
        email: `Kirim email kepada ${portfolio.profile.name}`,
        social: "{name} di {platform}",
        opensInNewTab: "dibuka di tab baru",
      },
    }));

    expect(html).not.toContain("Pesan instan");
    expect(html).toContain(
      `aria-label="${portfolio.profile.name} di LinkedIn (dibuka di tab baru)"`,
    );
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  });
});

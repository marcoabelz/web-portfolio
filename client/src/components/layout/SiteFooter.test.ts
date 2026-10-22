import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/layout/SiteFooter";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("SiteFooter", () => {
  it("shows the copyright and a back-to-top link that lands on the main content", () => {
    const html = renderToStaticMarkup(React.createElement(SiteFooter, {
      labels: { copyright: "© 2026 Someone", backToTop: "Kembali ke atas" },
    }));

    expect(html).toContain("© 2026 Someone");
    expect(html).toContain("Kembali ke atas");
    expect(html).toContain('href="#main-content"');
  });

  it("no longer repeats the social links the contact section carries", () => {
    const html = renderToStaticMarkup(React.createElement(SiteFooter, {
      labels: { copyright: "© 2026 Someone", backToTop: "Back to top" },
    }));

    expect(html).not.toContain("_blank");
    expect(html).not.toContain("mailto:");
  });
});

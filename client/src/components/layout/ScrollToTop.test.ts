import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { getScrollBehavior, ScrollToTop } from "@/components/layout/ScrollToTop";

describe("ScrollToTop", () => {
  it("renders an accessible button that starts outside the tab order", () => {
    const html = renderToStaticMarkup(createElement(ScrollToTop, {
      label: "Kembali ke atas",
    }));

    expect(html).toContain('aria-label="Kembali ke atas"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it("uses smooth scrolling unless reduced motion is requested", () => {
    expect(getScrollBehavior(false)).toBe("smooth");
    expect(getScrollBehavior(true)).toBe("auto");
  });

  it("does not install a global scroll-listener fallback", () => {
    const source = readFileSync(new URL("./ScrollToTop.tsx", import.meta.url), "utf8");

    expect(source).not.toContain('window.addEventListener("scroll"');
    expect(source).not.toContain('window.removeEventListener("scroll"');
  });
});

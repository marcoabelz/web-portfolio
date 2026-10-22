import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ArchiveLoading from "./[locale]/work/archive/loading";
import CaseStudyLoading from "./[locale]/work/[slug]/loading";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe.each([
  ["case study", CaseStudyLoading],
  ["archive", ArchiveLoading],
])("%s loading state", (_name, Loading) => {
  const html = renderToStaticMarkup(<Loading />);

  it("is marked busy", () => {
    expect(html).toContain('aria-busy="true"');
  });

  it("renders shimmering skeleton blocks", () => {
    expect(html.match(/class="[^"]*\bskeleton\b/g)?.length ?? 0).toBeGreaterThan(3);
  });

  it("ships no text copy that would need translating", () => {
    expect(html.replace(/<[^>]*>/g, "").trim()).toBe("");
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { dialogImageWidth, ScreenshotGallery, slideMaxWidthRem } from "./ScreenshotGallery";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const labels = { enlarge: "Enlarge", close: "Close" };

describe("ScreenshotGallery", () => {
  it("sizes each screenshot from its own stored dimensions", () => {
    const html = renderToStaticMarkup(
      <ScreenshotGallery
        labels={labels}
        screenshots={[
          { src: "/media/wide.webp", width: 1600, height: 900, alt: "Wide" },
          { src: "/media/tall.webp", width: 900, height: 1600, alt: "Tall" },
        ]}
      />,
    );

    expect(html).toMatch(/width="1600"[^>]*height="900"|height="900"[^>]*width="1600"/);
    expect(html).toMatch(/width="900"[^>]*height="1600"|height="1600"[^>]*width="900"/);
    expect(html).not.toContain('width="1920"');
  });

  it("fits the dialog image inside 95vw x 90vh at the screenshot's own ratio", () => {
    expect(dialogImageWidth({ width: 1920, height: 1200 })).toBe("min(95vw, calc(90vh * 1.6))");
    expect(dialogImageWidth({ width: 900, height: 1600 })).toBe("min(95vw, calc(90vh * 0.5625))");
  });

  it("caps a slide by height so a phone screenshot stays phone-sized", () => {
    // Landscape shots are limited by the 42rem width; portrait ones by the 36rem height.
    expect(slideMaxWidthRem({ width: 1920, height: 1200 })).toBe(42);
    expect(slideMaxWidthRem({ width: 390, height: 844 })).toBe(16.64);

    const html = renderToStaticMarkup(
      <ScreenshotGallery labels={labels} screenshots={[{ src: "/media/phone.webp", width: 390, height: 844, alt: "Phone" }]} />,
    );

    expect(html).toContain("--slide-max:16.64rem");
  });
});

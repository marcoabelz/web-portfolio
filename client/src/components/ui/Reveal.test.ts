import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { REVEAL_OBSERVER_OPTIONS, Reveal } from "@/components/ui/Reveal";

describe("Reveal", () => {
  it("renders content before JavaScript enhances it", () => {
    const html = renderToStaticMarkup(
      createElement(Reveal, null, createElement("section", null, "Selected work")),
    );

    expect(html).toContain('class="reveal-section"');
    expect(html).toContain("Selected work");
    expect(html).not.toContain("reveal-ready");
  });

  it("reveals sections shortly after they enter the viewport", () => {
    expect(REVEAL_OBSERVER_OPTIONS).toEqual({
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    });
  });
});

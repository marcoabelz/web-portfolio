import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ICON_SPRITE_URL } from "@/lib/icons-sprite";

import { SectionHeader } from "./SectionHeader";
import { SkeletonImage } from "./SkeletonImage";
import { TechChip } from "./TechChip";

describe("ui primitives", () => {
  it("section header renders a numbered h2 with the given id", () => {
    const html = renderToStaticMarkup(<SectionHeader id="services" number="03" title="Services" description="d" />);
    expect(html).toMatch(/<h2[^>]*id="services"[^>]*>Services<\/h2>/);
    expect(html).toContain("(03)");
  });

  it("tech chip references the shared sprite instead of inlining the path", () => {
    const html = renderToStaticMarkup(
      <TechChip tag={{ name: "React", icon: { kind: "brand", slug: "react", title: "React" } }} />,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain(`<use href="${ICON_SPRITE_URL}#si-react"`);
    expect(ICON_SPRITE_URL.startsWith("/icons.svg")).toBe(true);
    expect(html).not.toContain("<path");
    expect(html).toContain(">React<");
  });

  it("skeleton image starts unloaded", () => {
    expect(
      renderToStaticMarkup(<SkeletonImage src="/media/portrait.jpg" width={640} height={640} alt="x" sizes="100vw" />),
    ).toContain('data-loaded="false"');
  });
});

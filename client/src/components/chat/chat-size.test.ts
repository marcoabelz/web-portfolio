import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The widget is client-only chrome, so its size is pinned from the class source, the
// same way the other layout rules in this repo are.
const source = readFileSync(join(process.cwd(), "src/components/chat/ChatWidget.tsx"), "utf8");
const panelClasses = source.match(/id="chat-panel"[\s\S]*?className=\{`([^`]*)`\}/)?.[1] ?? "";

describe("chat panel size", () => {
  it("is at least 440px wide on desktop and never wider than the viewport", () => {
    const width = panelClasses.match(/md:w-\[min\((\d+(?:\.\d+)?)rem,/);
    expect(width).not.toBeNull();
    expect(Number(width![1]) * 16).toBeGreaterThanOrEqual(440);
    expect(panelClasses).toMatch(/md:w-\[min\([^\]]*100vw/);
  });

  it("is tall on desktop but capped to the viewport", () => {
    const height = panelClasses.match(/md:h-\[min\((\d+(?:\.\d+)?)rem,/);
    expect(height).not.toBeNull();
    expect(Number(height![1]) * 16).toBeGreaterThanOrEqual(640);
    expect(panelClasses).toMatch(/md:max-h-\[calc\(100dvh-/);
  });

  it("is a near full-screen sheet on a phone that respects safe areas", () => {
    expect(panelClasses).toMatch(/inset-x-2/);
    expect(panelClasses).toMatch(/safe-area-inset-bottom/);
    expect(panelClasses).toMatch(/\bh-\[calc\(100dvh-/);
  });

  it("keeps message text at 16px on a phone", () => {
    expect(source).toMatch(/BUBBLE_BASE = "[^"]*\btext-base\b/);
  });

  it("follows the visual viewport on a phone and does not focus the input there", () => {
    expect(source).toMatch(/window\.visualViewport/);
    expect(source).toMatch(/addEventListener\("resize", update\)/);
    expect(source).toMatch(/removeEventListener\("resize", update\)/);
    // The phone branch focuses the close button; focus-trap.test.ts pins the details.
    expect(source).toMatch(/matchMedia\(PHONE_QUERY\)\.matches\) closeRef\.current\?\.focus\(\)/);
    expect(source).toMatch(/role="dialog"/);
    expect(source).toMatch(/aria-modal=/);
  });
});

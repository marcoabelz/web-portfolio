import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { trapTarget } from "./focus-trap";

type Fake = HTMLElement & { name: string };

function item(name: string, visible = true): Fake {
  return { name, hidden: false, getClientRects: () => (visible ? [{}] : []) } as unknown as Fake;
}

function panel(items: Fake[]): HTMLElement {
  return {
    querySelectorAll: () => items,
    contains: (node: unknown) => items.includes(node as Fake),
  } as unknown as HTMLElement;
}

describe("trapTarget", () => {
  const close = item("close");
  const input = item("input");
  const send = item("send");
  const container = panel([close, input, send]);

  it("wraps Tab from the last element to the first, and Shift+Tab back", () => {
    expect(trapTarget(container, send, false)).toBe(close);
    expect(trapTarget(container, close, true)).toBe(send);
  });

  it("leaves Tab between inner elements to the browser", () => {
    expect(trapTarget(container, close, false)).toBeNull();
    expect(trapTarget(container, input, true)).toBeNull();
  });

  it("pulls focus back in when it escaped the panel", () => {
    expect(trapTarget(container, null, false)).toBe(close);
    expect(trapTarget(container, item("outside"), true)).toBe(send);
  });

  it("skips elements hidden by CSS", () => {
    const hiddenClose = item("close", false);
    expect(trapTarget(panel([hiddenClose, input, send]), send, false)).toBe(input);
  });
});

// The widget is client-only chrome with no DOM in this test environment, so its focus
// rules are pinned from the source, like chat-size.test.ts does for its size.
describe("chat panel focus", () => {
  const source = readFileSync(join(process.cwd(), "src/components/chat/ChatWidget.tsx"), "utf8");

  it("focuses the close button, not the input, when the sheet opens on a phone", () => {
    expect(source).toMatch(/matchMedia\(PHONE_QUERY\)\.matches\) closeRef\.current\?\.focus\(\);\s*else inputRef\.current\?\.focus\(\);/);
  });

  it("re-reads phone or desktop when the media query changes", () => {
    expect(source).toMatch(/phone\.addEventListener\("change", update\)/);
  });

  it("is modal only on a phone, where Tab is trapped", () => {
    expect(source).toContain("aria-modal={isOpen && isPhone ? true : undefined}");
    expect(source).toMatch(/event\.key === "Tab" && isPhone/);
  });
});

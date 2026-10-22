import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildStack, isWideGroup } from "@/data/home";
import { getContentFiles } from "@/lib/content/load";
import { getMessages } from "@/i18n/messages";

import { Stack } from "./Stack";

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe.each(["en", "id"] as const)("stack section (%s)", (locale) => {
  const model = buildStack(locale);
  const facts = getContentFiles().portfolio.skillGroups;
  const { common, portfolio } = getMessages(locale);

  it("builds one group per skill group with localized title and wide flag", () => {
    expect(model.title).toBe(common.sections.stack.title);
    expect(model.description).toBe(common.sections.stack.description);
    expect(model.groups.map((group) => group.id)).toEqual(facts.map((fact) => fact.id));
    model.groups.forEach((group, index) => {
      const fact = facts[index];
      expect(group.title).toBe(
        (portfolio.skillGroupTitles as Record<string, string>)[fact.id],
      );
      expect(group.tags.map((tag) => tag.name)).toEqual(fact.skills);
      expect(group.wide).toBe(fact.skills.length > 5);
    });
  });

  it("renders a card per group, wide span, sprite-referencing chips and no img", () => {
    const html = renderToStaticMarkup(<Stack model={model} number="05" />);

    expect(html).toContain('id="stack"');
    expect(html).toContain('aria-labelledby="stack-heading"');
    expect(html).toContain("(05)");
    expect(html.match(/data-card="stack"/g)).toHaveLength(model.groups.length);
    expect(html.match(/class="stack-item stack-wide"/g)?.length ?? 0).toBe(model.groups.filter((g) => g.wide).length);
    expect(html).not.toMatch(/stack-wide[a-z-]/);
    model.groups.forEach((group) => {
      expect(html).toContain(escapeHtml(group.title));
      group.tags.forEach((tag) => expect(html).toContain(`>${escapeHtml(tag.name)}</span>`));
    });
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<path d="[^"]{60,}"/);
    if (model.groups.some((g) => g.tags.some((t) => t.icon.kind === "brand"))) {
      expect(html).toContain('<use href="/icons.svg#si-');
    }
  });

  it("renders a monogram chip's text", () => {
    const withMonogram = {
      ...model,
      groups: [
        {
          id: "x",
          title: "X",
          wide: false,
          tags: [{ name: "BullMQ", icon: { kind: "monogram" as const, text: "BQ" } }],
        },
      ],
    };
    const html = renderToStaticMarkup(<Stack model={withMonogram} number="05" />);
    expect(html).toContain(">BQ<");
  });

  it("marks a group wide only above five skills", () => {
    expect(isWideGroup(5)).toBe(false);
    expect(isWideGroup(6)).toBe(true);
  });
});

import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildAbout } from "@/data/home";
import { getContentFiles } from "@/lib/content/load";
import { getMessages } from "@/i18n/messages";

import { About } from "./About";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe.each(["en", "id"] as const)("about section (%s)", (locale) => {
  const model = buildAbout(locale);
  const facts = getContentFiles().portfolio;
  const { common, portfolio } = getMessages(locale);

  it("splits the paragraphs into a lead and the rest", () => {
    expect(model.title).toBe(common.sections.about.title);
    expect(model.lead).toBe(portfolio.aboutParagraphs[0]);
    expect(model.paragraphs).toEqual(portfolio.aboutParagraphs.slice(1));
  });

  it("builds one card per education entry plus one languages card", () => {
    expect(model.cards).toHaveLength(facts.education.length + 1);

    facts.education.forEach((entry, index) => {
      const copy = portfolio.education[entry.id as keyof typeof portfolio.education];
      expect(model.cards[index]).toEqual({
        label: common.sections.about.education,
        title: entry.institution,
        detail: `${copy.program} · ${copy.period} · ${copy.result}`,
      });
    });

    const names = facts.languages.map(({ id }) => portfolio.languages[id as keyof typeof portfolio.languages]);
    expect(model.cards.at(-1)).toEqual({
      label: common.sections.about.languages,
      title: names.map((language) => language.name).join(" · "),
      detail: names.map((language) => language.proficiency).join(" · "),
    });
  });

  it("renders the lead larger than the body paragraphs and every card", () => {
    const html = renderToStaticMarkup(<About model={model} number="02" />);

    expect(html).toContain('id="about"');
    expect(html).toContain('aria-labelledby="about-heading"');
    expect(html).toContain("(02)");
    expect(html).toMatch(/<p class="about-lead">/);
    expect(html.match(/<p class="about-para">/g)).toHaveLength(model.paragraphs.length);
    expect(html.match(/data-card="about"/g)).toHaveLength(model.cards.length);
  });

  it("escapes nothing away: every paragraph and card text is present", () => {
    const text = renderToStaticMarkup(<About model={model} number="02" />)
      .replace(/<[^>]+>/g, " ")
      .replaceAll("&amp;", "&")
      .replaceAll("&#x27;", "'")
      .replace(/\s+/g, " ");

    [model.lead, ...model.paragraphs].forEach((paragraph) => expect(text).toContain(paragraph));
    model.cards.forEach((card) => {
      expect(text).toContain(card.label);
      expect(text).toContain(card.title);
      expect(text).toContain(card.detail);
    });
  });
});

describe("about layout stylesheet", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const wide = css.slice(css.indexOf("@media (min-width: 960px)", css.indexOf(".about-cards")));
  const rule = (selector: string) =>
    wide.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

  it("uses the full content width from 960px instead of an empty first column", () => {
    expect(rule(".about-grid")).toContain("8fr 4fr");
    expect(rule(".about-grid")).not.toContain("2fr 6fr 4fr");
    expect(rule(".about-main")).not.toMatch(/grid-column\s*:\s*2/);
    expect(rule(".about-cards")).not.toMatch(/grid-column\s*:\s*3/);
  });
});

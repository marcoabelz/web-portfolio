import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildExperience } from "@/data/home";
import { getContentFiles } from "@/lib/content/load";
import { getMessages } from "@/i18n/messages";

import { Experience } from "./Experience";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe.each(["en", "id"] as const)("experience section (%s)", (locale) => {
  const model = buildExperience(locale);
  const facts = getContentFiles().portfolio.experiences;
  const { common } = getMessages(locale);

  it("builds one row per fact with a localized period and place", () => {
    expect(model.title).toBe(common.sections.experience.title);
    expect(model.description).toBe(common.sections.experience.description);
    expect(model.rows.map((row) => row.id)).toEqual(facts.map((fact) => fact.id));
    facts.forEach((fact, index) => {
      const row = model.rows[index];
      const city = fact.location.split(",")[0].trim();
      expect(row.place).toBe(`${city} · ${common.labels.workMode[fact.workMode]}`);
      expect(row.period).not.toMatch(/\d{4}-\d{2}/);
      if (fact.endDate === null) expect(row.period).toContain(common.sections.experience.present);
      expect(row.stack.map((tag) => tag.name)).toEqual(fact.stack);
    });
  });

  it("renders collapsed disclosures wired to their panels", () => {
    const html = renderToStaticMarkup(<Experience model={model} number="04" />);

    expect(html).toContain('id="experience"');
    expect(html).toContain("(04)");
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(facts.length);
    expect(html).not.toContain('aria-expanded="true"');

    model.rows.forEach((row) => {
      expect(html).toContain(`aria-controls="experience-${row.id}-details"`);
      expect(html).toContain(`id="experience-${row.id}-details"`);
      expect(html).toContain(row.place);
      row.highlights.forEach((highlight) => expect(html).toContain(highlight.replaceAll("'", "&#x27;")));
    });
  });

  it("keeps collapsed panels as plain disclosure content and logos as sprite references", () => {
    const html = renderToStaticMarkup(<Experience model={model} number="04" />);

    expect(html).not.toContain('role="region"');
    expect(html).not.toMatch(/<path d="[^"]{60,}"/);
    expect(html).toContain('<use href="/icons.svg#si-');
    expect(html.match(/class="exp-panel" data-open="false"/g)).toHaveLength(facts.length);
    model.rows.forEach((row) => {
      expect(html).toContain(`aria-label="${row.stackLabel.replaceAll("&", "&amp;")}"`);
    });
  });
});

describe.each(["en", "id"] as const)("experience panel groups (%s)", (locale) => {
  const model = buildExperience(locale);
  const copy = getMessages(locale).common.sections.experience;

  it("labels the highlights and stack groups from messages", () => {
    expect(copy.highlightsLabel.trim()).not.toBe("");
    expect(copy.stackLabel.trim()).not.toBe("");
    expect(model.labels.highlights).toBe(copy.highlightsLabel);
    expect(model.labels.stack).toBe(copy.stackLabel);

    const html = renderToStaticMarkup(<Experience model={model} number="04" />);
    expect(html.match(/class="exp-group-label"/g)).toHaveLength(model.rows.length * 2);
    model.rows.forEach((row) => {
      expect(html).toContain(`id="experience-${row.id}-highlights-label"`);
      expect(html).toContain(`aria-labelledby="experience-${row.id}-highlights-label"`);
      expect(html).toContain(`aria-label="${row.stackLabel.replaceAll("&", "&amp;")}"`);
    });
  });

  it("keeps the disclosure attributes intact", () => {
    const html = renderToStaticMarkup(<Experience model={model} number="04" />);
    model.rows.forEach((row) => {
      expect(html).toContain(`id="experience-${row.id}-button"`);
      expect(html).toContain(`aria-controls="experience-${row.id}-details"`);
    });
  });
});

describe("experience stylesheet", () => {
  it("aligns the panel to the row grid and stacks it below 960px", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const wide = css.slice(css.indexOf("@media (min-width: 960px)", css.indexOf(".exp-stack")));
    expect(wide).toMatch(/\.exp-details \{[^}]*grid-template-columns:[^;}]*\bminmax\(0, 6fr\) minmax\(0, 5fr\)[^}]*margin-left:/);
    expect(wide).toMatch(/\.exp-button \{[^}]*grid-template-columns: var\(--exp-cols\)[^}]*gap: var\(--exp-gap\)/);
    expect(wide).toMatch(/\.exp-details \{[^}]*margin-left: calc\([^;}]*var\(--exp-gap\)/);
    expect(css).toMatch(/\.exp-highlights \{[^}]*max-w-\[(?:[4-7]\d)ch\]/);
  });

  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("animates the panel with grid rows and hides collapsed content from Tab", () => {
    expect(css).toMatch(/\.exp-panel \{[^}]*grid-template-rows: 0fr/);
    expect(css).toMatch(/\.exp-panel\[data-open="true"\] \{[^}]*grid-template-rows: 1fr/);
    expect(css).toMatch(/\.exp-panel-clip \{[^}]*visibility: hidden/);
  });
});

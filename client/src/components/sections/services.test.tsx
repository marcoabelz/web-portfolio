import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildServices } from "@/data/home";
import { getContentFiles } from "@/lib/content/load";
import { getMessages } from "@/i18n/messages";

import { Services } from "./Services";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe.each(["en", "id"] as const)("services section (%s)", (locale) => {
  const model = buildServices(locale);
  const facts = getContentFiles().portfolio.services;
  const { common, portfolio } = getMessages(locale);

  it("builds one item per service fact with its copy and tags", () => {
    expect(model.title).toBe(common.sections.services.title);
    expect(model.description).toBe(common.sections.services.description);
    expect(model.processLabel).toBe(common.sections.services.process);
    expect(model.stepLabel).toBe(common.sections.services.step);
    expect(model.items).toEqual(
      facts.map((fact) => ({
        id: fact.id,
        ...portfolio.services[fact.id as keyof typeof portfolio.services],
        tags: fact.tags,
      })),
    );
    expect(model.steps).toEqual(portfolio.process);
  });

  it("renders numbered cards, plain-text chips and zero-padded step labels", () => {
    const html = renderToStaticMarkup(<Services model={model} number="03" />);

    expect(html).toContain('id="services"');
    expect(html).toContain('aria-labelledby="services-heading"');
    expect(html).toContain("(03)");
    expect(html.match(/data-card="service"/g)).toHaveLength(model.items.length);
    expect(html).toContain(">01<");
    expect(html).toContain(`>${String(model.items.length).padStart(2, "0")}<`);
    model.items.forEach((item) => item.tags.forEach((tag) => expect(html).toContain(`>${tag}</span>`)));
    expect(html).not.toContain("<svg");

    model.steps.forEach((_, index) => {
      const number = String(index + 1).padStart(2, "0");
      expect(html).toContain(model.stepLabel.replace("{number}", number));
    });
    expect(html).not.toContain("{number}");
    expect(html.match(/class="process-step"/g)).toHaveLength(model.steps.length);
  });
});

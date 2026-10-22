import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));

import LocalizedHome from "@/app/[locale]/page";
import { buildLab, buildTestimonials, getHomeSections } from "@/data/home";
import { getArchiveProjects } from "@/data/projects";
import { getContentFiles } from "@/lib/content/load";
import { getMessages } from "@/i18n/messages";

import { Lab } from "./Lab";
import { Testimonials } from "./Testimonials";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

describe.each(["en", "id"] as const)("lab section (%s)", (locale) => {
  const model = buildLab(locale);
  const facts = getContentFiles().portfolio.lab;
  const { common, portfolio } = getMessages(locale);
  const archive = new Map(getArchiveProjects(locale).map((project) => [project.id, project]));

  it("builds one item per lab entry with the right description and url", () => {
    expect(model.title).toBe(common.sections.lab.title);
    expect(model.description).toBe(common.sections.lab.description);
    expect(model.items.map((item) => item.id)).toEqual(facts.map((fact) => fact.id));
    model.items.forEach((item, index) => {
      const fact = facts[index];
      if (fact.source === "archive") {
        const project = archive.get(fact.archiveId)!;
        expect(item.name).toBe(project.name);
        expect(item.description).toBe(project.descriptor);
        expect(item.url).toBe(project.repositoryUrl);
        expect(item.stack.map((tag) => tag.name)).toEqual(project.stack);
      } else {
        const copy = (portfolio.lab as Record<string, { description: string }>)[fact.id];
        expect(item.name).toBe(fact.name);
        expect(item.description).toBe(copy.description);
        expect(item.url).toBe(fact.url);
        expect(item.stack.map((tag) => tag.name)).toEqual(fact.stack);
      }
    });
  });

  it("renders a card per entry with a new-tab repository link", () => {
    const html = renderToStaticMarkup(<Lab model={model} number="06" />);

    expect(html).toContain('id="lab"');
    expect(html).toContain('aria-labelledby="lab-heading"');
    expect(html).toContain("(06)");
    expect(html.match(/data-card="repo"/g)).toHaveLength(model.items.length);
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(model.items.length);
    model.items.forEach((item) => {
      expect(html).toContain(`href="${escapeHtml(item.url)}"`);
      expect(html).toContain(escapeHtml(item.description));
      expect(html).toContain(`>${escapeHtml(item.name)}</span>`);
      item.stack.forEach((tag) => expect(html).toContain(`>${escapeHtml(tag.name)}</span>`));
    });
    expect(html).toContain(escapeHtml(common.accessibility.opensInNewTab));
  });
});

describe("testimonials section", () => {
  const facts = [{ id: "a", name: "Fixture Name", company: "Company" }];
  const copy = { a: { quote: "Fixture quote.", role: "Role" } };

  it("builds one item per testimonial from facts and copy", () => {
    expect(buildTestimonials("en", facts, copy).items).toEqual([
      { id: "a", quote: "Fixture quote.", name: "Fixture Name", role: "Role", company: "Company" },
    ]);
    expect(buildTestimonials("en", [], {}).items).toEqual([]);
  });

  it("throws when a testimonial has no copy", () => {
    expect(() => buildTestimonials("en", facts, {})).toThrow(/testimonials: no localized copy for "a"/);
  });

  it("matches the content files in both locales", () => {
    const count = getContentFiles().portfolio.testimonials.length;
    expect(buildTestimonials("en").items).toHaveLength(count);
    expect(buildTestimonials("id").items).toHaveLength(count);
  });

  it("renders a figure with blockquote and attribution per fixture item", () => {
    const html = renderToStaticMarkup(
      <Testimonials
        number="07"
        model={{
          title: "Testimonials",
          items: [{ id: "a", quote: "Fixture quote.", name: "Fixture Name", role: "Role", company: "Company" }],
        }}
      />,
    );

    expect(html).toContain('id="testimonials"');
    expect(html).toContain("(07)");
    expect(html).toMatch(/<figure[^>]*>.*<blockquote[^>]*>Fixture quote\.<\/blockquote>/);
    expect(html).toContain("Fixture Name");
    expect(html).toContain("Role");
    expect(html).toContain("Company");
    expect(html).toContain('aria-hidden="true">\u201C<');
  });

  it("skips an empty role or company instead of joining with a stray comma", () => {
    const html = renderToStaticMarkup(
      <Testimonials
        number="07"
        model={{ title: "T", items: [{ id: "a", quote: "Q", name: "N", role: "", company: "Company" }] }}
      />,
    );
    expect(html).not.toContain("quote-role");
    expect(html).not.toContain(",");
    expect(html).toContain("Company");
  });
});

describe.each(["en", "id"] as const)("homepage lab and testimonials (%s)", (locale) => {
  it("shows each section only when it has entries, with gap-free numbering", async () => {
    const { portfolio, site } = getContentFiles();
    const html = renderToStaticMarkup(await LocalizedHome({ params: { locale } }));
    const ids = Array.from(html.matchAll(/<section[^>]*id="([a-z]+)"/g), (match) => match[1]);
    const visible = (id: string) => site.sections.find((section) => section.id === id)?.visible ?? false;

    expect(ids.includes("testimonials")).toBe(visible("testimonials") && portfolio.testimonials.length > 0);
    expect(ids.includes("lab")).toBe(visible("lab") && portfolio.lab.length > 0);
    expect(ids).toEqual(getHomeSections().map((section) => section.id));

    const numbers = Array.from(html.matchAll(/section-header-no">\((\d+)\)</g), (match) => Number(match[1]));
    expect(numbers).toEqual(numbers.map((_, index) => index + 1));
  });
});

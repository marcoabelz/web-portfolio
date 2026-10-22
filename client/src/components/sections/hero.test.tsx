import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getHomeModel } from "@/data/home";
import { getContentFiles } from "@/lib/content/load";
import type { BentoModel, HeroModel } from "@/data/home";

import { Bento } from "./Bento";
import { Hero } from "./Hero";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function heroModel(overrides: Partial<Pick<HeroModel, "name" | "nickname">> = {}): HeroModel {
  return {
    name: "Marco Abel Zefanya",
    nickname: "Abel",
    intro: { lead: "Lead,", tail: "tail." },
    actions: {
      apps: { label: "View apps", href: "/#apps" },
      project: { label: "Start a project", href: "/#contact" },
      resume: { label: "Download CV", href: "/cv.pdf" },
    },
    ...overrides,
  };
}

function bentoModel(): BentoModel {
  const tag = (name: string) => ({ name, icon: { kind: "monogram" as const, text: name.slice(0, 2) } });

  return {
    portrait: { src: "/media/portrait.jpg", width: 640, height: 640, alt: "Marco Abel Zefanya" },
    caption: { name: "Marco Abel Zefanya", title: "Full-Stack Engineer", specialty: "Backend" },
    facts: [
      { label: "Experience", value: "4+", caption: "years" },
      { label: "Shipped", value: "5", caption: "products" },
      { label: "Based in", value: "Jakarta", caption: "Indonesia (GMT+7)" },
    ],
    dailyStack: { label: "Daily stack", tags: [tag("Next.js"), tag("Docker")] },
  };
}

describe("hero", () => {
  it("highlights the nickname and keeps the name wrappable", () => {
    const html = renderToStaticMarkup(<Hero model={heroModel()} />);

    expect(html).toMatch(/<h1[^>]*>[\s\S]*Marco[\s\S]*class="[^"]*text-accent[^"]*"[^>]*>Abel[\s\S]*Zefanya[\s\S]*<\/h1>/);
    expect(html).not.toContain("whitespace-nowrap");
  });

  it("never sets white-space: nowrap on the name in the stylesheet", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const rules = Array.from(css.matchAll(/([^{}]*\.hero-[a-z-]+[^{}]*)\{([^{}]*)\}/g));

    expect(rules.length).toBeGreaterThan(0);
    for (const [, selector, body] of rules) {
      expect(body, selector.trim()).not.toMatch(/white-space\s*:\s*(nowrap|pre)/);
    }
  });

  it("exposes the full name as the h1 text", () => {
    const html = renderToStaticMarkup(<Hero model={heroModel()} />);
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1];

    expect(h1.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).toBe("Marco Abel Zefanya");
  });

  it("wraps a much longer name word by word", () => {
    const html = renderToStaticMarkup(
      <Hero model={heroModel({ name: "Marco Abel Zefanya Wibisono Hadiningrat" })} />,
    );

    expect(html).toContain(">Hadiningrat<");
    expect(html).not.toContain("whitespace-nowrap");
  });

  it("renders the intro and the three actions", () => {
    const html = renderToStaticMarkup(<Hero model={heroModel()} />);

    expect(html).toContain("Lead,");
    expect(html).toContain("tail.");
    expect(html).toContain('href="/#apps"');
    expect(html).toContain('href="/#contact"');
    expect(html).toContain('href="/cv.pdf"');
  });

  it("builds the model from the content files in both locales", () => {
    for (const locale of ["en", "id"] as const) {
      const { site } = getContentFiles();
      const { hero, bento } = getHomeModel(locale);

      expect(hero?.name).toBe(site.profile.name);
      expect(hero?.actions.apps.href).toBe(locale === "en" ? "/#apps" : "/id#apps");
      // The two hero facts plus the location.
      expect(bento?.facts).toHaveLength(Object.keys(site.heroFacts).length + 1);
      expect(bento?.facts.at(-1)?.caption).toBe(`${site.profile.country} (${site.profile.timezone})`);
      expect(bento?.dailyStack.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("bento", () => {
  it("renders three facts and the daily stack", () => {
    const html = renderToStaticMarkup(<Bento model={bentoModel()} />);

    expect(html.match(/data-fact/g)).toHaveLength(3);
    expect(html).toContain("Indonesia (GMT+7)");
    expect(html).toContain("Daily stack");
    expect(html).toContain(">Docker<");
  });

  it("loads the portrait eagerly with priority behind a skeleton", () => {
    const html = renderToStaticMarkup(<Bento model={bentoModel()} />);

    expect(html).toContain('data-loaded="false"');
    expect(html).toMatch(/<img[^>]*fetchPriority="high"/i);
    expect(html).not.toContain('loading="lazy"');
    expect(html).toContain("Full-Stack Engineer");
  });
});

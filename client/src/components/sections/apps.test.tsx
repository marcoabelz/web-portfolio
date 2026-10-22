import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getContentFiles } from "@/lib/content/load";
import { buildApps, featuredSlug, getHomeModel, isFeatured } from "@/data/home";
import type { AppCardModel, AppsModel } from "@/data/home";

import { privateAppWithShotsDraft } from "@/lib/admin/test-draft";

import { SelectedApps } from "./SelectedApps";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const tag = (name: string) => ({ name, icon: { kind: "monogram" as const, text: name.slice(0, 2) } });

function cards(): AppCardModel[] {
  const base = { contextLabel: "Production", years: "2026", outcome: "Outcome.", href: "/work/x" };
  const priv = (slug: string, variant: "signal" | "vision" | "talent" | "telemetry"): AppCardModel => ({
    ...base,
    kind: "private",
    slug,
    name: slug,
    years: "2025",
    href: `/work/${slug}`,
    cover: { variant, alt: `${slug} cover` },
    confidential: true,
  });

  return [
    {
      ...base,
      kind: "featured",
      slug: "satellyte",
      name: "Satellyte",
      href: "/work/satellyte",
      liveUrl: "https://satellyte.ai",
      screenshot: { src: "/work/satellyte/satellyte-1.png", width: 1920, height: 1200, alt: "Dashboard" },
      stack: [tag("Next.js"), tag("Docker")],
    },
    priv("palmgrade", "vision"),
    priv("talent", "talent"),
    priv("erp", "signal"),
    priv("plant", "telemetry"),
  ];
}

function appsModel(overrides: Partial<AppsModel> = {}): AppsModel {
  return {
    title: "Selected apps",
    description: "Five products.",
    privateNote: "Private production systems are shown without screenshots.",
    earlierLabel: "Earlier projects",
    earlierHref: "/work/archive",
    labels: {
      live: "Live",
      viewCaseStudy: "View case study",
      privateSystem: "Private production system",
      technologyStack: "Technology stack",
      openLive: "View the {projectName} app",
      newTab: "opens in a new tab",
    },
    cards: cards(),
    ...overrides,
  };
}

describe("selected apps", () => {
  it("features public apps with a screenshot and keeps private apps without one on the pattern cover", () => {
    const html = renderToStaticMarkup(<SelectedApps model={appsModel()} number="01" />);

    const model = appsModel();
    const featured = model.cards.filter((card) => card.kind === "featured").length;
    const hidden = model.cards.filter((card) => card.kind === "private").length;

    expect(featured).toBeGreaterThan(0);
    expect(html.match(/data-card="featured"/g)).toHaveLength(featured);
    expect(html.match(/data-card="private"/g)).toHaveLength(hidden);
    const segments = html.split(/(?=data-card=")/).slice(1);
    expect(segments).toHaveLength(model.cards.length);
    segments
      .filter((segment) => segment.startsWith('data-card="private"'))
      .forEach((segment) => expect(segment).not.toContain("<img"));
    expect(html).toMatch(/<section[^>]*id="apps"/);
    expect(html).toContain("(01)");
    expect(html).toContain('href="/work/archive"');
  });

  it("never builds a featured card for a private app", () => {
    const first = featuredSlug(getContentFiles().projects.selected);
    const expected = first ? [first] : [];

    expect(
      getHomeModel("en").apps!.cards.filter((c) => c.kind === "featured").map((c) => c.slug),
    ).toEqual(expected);
    for (const app of getContentFiles().projects.selected) {
      if (app.privacy === "private") expect(expected).not.toContain(app.slug);
    }
    const facts = new Map(getContentFiles().projects.selected.map((app) => [app.slug, app]));
    getHomeModel("id").apps!.cards.forEach((card) => {
      if (card.kind === "private") expect("screenshot" in card).toBe(facts.get(card.slug)!.screenshots.length > 0);
    });
  });

  it("shows a private app's first screenshot as its cover, with the lock chip and no featured card", () => {
    const { draft, slug } = privateAppWithShotsDraft();
    const app = draft.content.projects.selected.find((entry) => entry.slug === slug)!;
    app.cover = { kind: "pattern", variant: "vision" };
    const model = buildApps("en", [app]);
    const html = renderToStaticMarkup(<SelectedApps model={model} number="01" />);

    expect(isFeatured(app)).toBe(false);
    expect(model.cards[0]).toMatchObject({ kind: "private", confidential: true, screenshot: { src: app.screenshots[0].src } });
    expect(html).toContain('data-card="private"');
    expect(html).not.toContain('data-card="featured"');
    expect(html).toContain("<img");
    expect(html).toContain(encodeURIComponent(app.screenshots[0].src));
    expect(html).toContain("cover-lock");
    expect(html).toContain(model.labels.privateSystem);
    expect(html).not.toContain("app-live");
  });

  it("lets an image cover lead the card of an app with screenshots, and never one without", () => {
    const { draft, slug } = privateAppWithShotsDraft();
    const app = draft.content.projects.selected.find((entry) => entry.slug === slug)!;
    const cover = { kind: "image" as const, src: "/work/cover-pick.webp", width: 1600, height: 1000 };
    const withShots = { ...app, cover };
    const withoutShots = { ...app, cover, screenshots: [] };
    const publicApp = { ...withShots, privacy: "public" as const, liveUrl: "https://example.com" };

    const [privateCard, bareCard, featuredCard] = buildApps("en", [withShots, withoutShots, publicApp]).cards;

    expect(privateCard).toMatchObject({ kind: "private", screenshot: { src: cover.src, width: 1600, height: 1000 } });
    expect(bareCard.kind).toBe("private");
    expect("screenshot" in bareCard).toBe(false);
    expect(featuredCard).toMatchObject({ kind: "featured", screenshot: { src: cover.src } });
  });

  it("gives every card with a picture an existing image fact of its app", () => {
    const facts = new Map(getContentFiles().projects.selected.map((app) => [app.slug, app]));

    for (const card of getHomeModel("en").apps!.cards) {
      if (!("screenshot" in card) || !card.screenshot) continue;
      const fact = facts.get(card.slug)!;
      const sources = [...fact.screenshots.map((shot) => shot.src), ...(fact.cover.kind === "image" ? [fact.cover.src] : [])];
      expect(sources).toContain(card.screenshot.src);
    }
  });

  it("joins years, context, and localized hrefs from content", () => {
    const id = getHomeModel("id").apps!;

    expect(id.cards.every((card) => card.years.length > 0 && card.contextLabel.length > 0)).toBe(true);
    expect(id.cards.every((card) => card.href.startsWith("/id/work/"))).toBe(true);
    expect(id.earlierHref).toBe("/id/work/archive");
  });

  it("features only the first qualifying app, so a second public app stays a plain card", () => {
    const apps = getContentFiles().projects.selected;
    const shot = [{ src: "/a.png", width: 1920, height: 1200 }];
    const twoPublic = apps.slice(0, 2).map((app, index) => ({
      ...app,
      privacy: "public" as const,
      liveUrl: `https://example.com/${index}`,
      screenshots: app.screenshots.length > 0 ? app.screenshots : shot,
    }));

    expect(twoPublic).toHaveLength(2);
    expect(featuredSlug(twoPublic)).toBe(twoPublic[0].slug);
    const model = buildApps("en", twoPublic);
    expect(model.cards.map((card) => card.kind)).toEqual(["featured", "private"]);
    expect(model.cards[1]).toMatchObject({ kind: "private", confidential: false });
    expect(featuredSlug([])).toBeUndefined();
  });

  it("features only public apps that have a screenshot and a live url", () => {
    const shot = [{ src: "/a.png", width: 1920, height: 1200 }];

    expect(isFeatured({ privacy: "public", liveUrl: "https://x.dev", screenshots: shot })).toBe(true);
    expect(isFeatured({ privacy: "public", screenshots: shot })).toBe(false);
    expect(isFeatured({ privacy: "public", liveUrl: "https://x.dev", screenshots: [] })).toBe(false);
    expect(isFeatured({ privacy: "private", liveUrl: "https://x.dev", screenshots: shot })).toBe(false);
  });

  it("does not claim a public fallback app is a private production system", () => {
    const apps = getContentFiles().projects.selected;
    const publicApp = apps.find((app) => app.privacy === "public") ?? { ...apps[0], privacy: "public" as const };
    const { liveUrl: _liveUrl, ...withoutLive } = publicApp as typeof publicApp & { liveUrl?: string };
    const model = buildApps("en", [withoutLive]);
    const html = renderToStaticMarkup(<SelectedApps model={model} number="01" />);

    expect(model.cards[0].kind).toBe("private");
    expect(html).toContain('data-card="private"');
    expect(html).not.toContain("cover-lock");
  });

  it("announces the private-system label once on confidential cards", () => {
    const model = buildApps("en");
    const html = renderToStaticMarkup(<SelectedApps model={model} number="01" />);
    const confidential = model.cards.filter((card) => card.kind === "private" && card.confidential).length;

    expect(html.match(new RegExp(`<p class="sr-only">${model.labels.privateSystem}</p>`, "g"))?.length ?? 0).toBe(
      confidential,
    );
  });
});

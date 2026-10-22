import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getProject, getSelectedProjectSlugs } from "@/data/projects";
import { CaseStudy } from "./CaseStudy";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const labels = {
  backToSelectedWork: "Back",
  context: "Context",
  role: "Role",
  availability: "Availability",
  liveProduct: "Live product",
  privateProductionSystem: "Private production system",
  openLiveProduct: "Open live product",
  newTabLabel: "opens in a new tab",
  sanitizedVisual: "Sanitized visual",
  sanitizedVisualDescription: "Representative visual.",
  enlargeScreenshot: "Enlarge screenshot",
  closeScreenshot: "Close screenshot",
  projectHighlights: "Project highlights",
  relatedWork: "Other apps",
  browseEarlierProjects: "Earlier work",
  sections: { overview: "About", features: "Features", role: "Responsibilities", stack: "Stack", screenshots: "Screenshots" },
};

function render(slug: string): { html: string; project: NonNullable<ReturnType<typeof getProject>> } {
  const project = getProject(slug, "en");
  if (!project) throw new Error(`no project ${slug}`);
  const stack = project.stack.map((name) => ({ name, icon: { kind: "monogram" as const, text: name.slice(0, 2) } }));
  const html = renderToStaticMarkup(
    <CaseStudy project={project} stack={stack} links={{ selectedWork: "/#apps", archive: "/work/archive" }} labels={labels} />,
  );
  return { html, project };
}

const projects = getSelectedProjectSlugs().map((slug) => render(slug));
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("case study", () => {
  it("renders every highlight as a list item", () => {
    for (const { html, project } of projects) {
      expect(html).toContain(`aria-label="${labels.projectHighlights}"`);
      for (const highlight of project.highlights) expect(html).toContain(escape(highlight));
    }
  });

  it("renders a screenshot gallery only for projects that have screenshots", () => {
    for (const { html, project } of projects) {
      const hasGallery = html.includes(`${labels.enlargeScreenshot}:`);
      expect(hasGallery).toBe(project.screenshots.length > 0);
    }
  });

  it("renders the gallery for a private app that has screenshots, still labelled private with no live link", () => {
    const { project: real } = projects.find(({ project }) => project.privacy === "private")!;
    const shots = projects.find(({ project }) => project.screenshots.length > 0)!.project.screenshots;
    const project = { ...real, screenshots: shots };
    const stack = project.stack.map((name) => ({ name, icon: { kind: "monogram" as const, text: name.slice(0, 2) } }));
    const html = renderToStaticMarkup(
      <CaseStudy project={project} stack={stack} links={{ selectedWork: "/#apps", archive: "/work/archive" }} labels={labels} />,
    );

    expect(html).toContain(`${labels.enlargeScreenshot}:`);
    expect(html).toContain(labels.privateProductionSystem);
    expect(html).not.toContain(labels.liveProduct);
  });

  it("labels at least one real case study private", () => {
    expect(projects.some(({ project }) => project.privacy === "private")).toBe(true);
  });

  it("labels every private case study as a private production system, whatever its cover", () => {
    for (const { html, project } of projects) {
      // The cover (with its lock chip) only shows when there is no gallery.
      expect(html.includes("cover-lock")).toBe(project.privacy === "private" && project.screenshots.length === 0);
      if (project.privacy === "private") expect(html).toContain(labels.privateProductionSystem);
    }
    expect(projects.some(({ project }) => project.privacy === "private" && project.cover.kind === "image")).toBe(true);
  });

  it("puts image covers behind the loading skeleton", () => {
    const covered = projects.filter(({ project }) => project.cover.kind === "image" && project.screenshots.length === 0);
    expect(covered.length).toBeGreaterThan(0);
    for (const { html } of covered) expect(html).toContain('data-loaded="false"');
  });

  it("puts screenshots behind the loading skeleton", () => {
    const withShots = projects.filter(({ project }) => project.screenshots.length > 0);
    expect(withShots.length).toBeGreaterThan(0);
    for (const { html } of withShots) expect(html).toContain('data-loaded="false"');
  });

  it("keeps a public app without a live URL public: no Live link and no private label", () => {
    const { project } = projects.find(({ project }) => project.privacy === "public")!;
    const { liveUrl: _liveUrl, ...withoutLive } = project;
    const stack = project.stack.map((name) => ({ name, icon: { kind: "monogram" as const, text: name.slice(0, 2) } }));
    const html = renderToStaticMarkup(
      <CaseStudy project={withoutLive} stack={stack} links={{ selectedWork: "/#apps", archive: "/work/archive" }} labels={labels} />,
    );

    expect(html).not.toContain(labels.liveProduct);
    expect(html).not.toContain(labels.privateProductionSystem);
    expect(html).not.toContain(labels.availability);
  });
});

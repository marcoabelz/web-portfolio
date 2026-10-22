import { describe, expect, it } from "vitest";

import portfolioJson from "../../../content/portfolio.json";
import projectsJson from "../../../content/projects.json";
import siteJson from "../../../content/site.json";
import { getAllMessages } from "@/i18n/messages";

import { getContentFiles, loadContentFrom } from "./load";

function rawWithTwoProblems() {
  const portfolio = structuredClone(portfolioJson) as Record<string, any>;
  const projects = structuredClone(projectsJson) as Record<string, any>;

  portfolio.experiences[0].startDate = "March 2026";
  // The last app, so the fixture works with any number of apps (screenshots without a size are invalid).
  projects.selected[projects.selected.length - 1].screenshots = [{ src: "/media/one.png" }];

  return { site: structuredClone(siteJson), portfolio, projects };
}

describe("getContentFiles", () => {
  it("returns the same object on repeated calls", () => {
    expect(getContentFiles()).toBe(getContentFiles());
  });

  it("loads the real content without issues", () => {
    expect(() => loadContentFrom({ site: siteJson, portfolio: portfolioJson, projects: projectsJson }, getAllMessages())).not.toThrow();
  });
});

describe("loadContentFrom", () => {
  it("lists every issue when the content is invalid", () => {
    const last = projectsJson.selected.length - 1;

    expect(() => loadContentFrom(rawWithTwoProblems(), getAllMessages())).toThrowError(
      new RegExp(`portfolio experiences\\[0\\]\\.startDate[\\s\\S]*projects selected\\[${last}\\]\\.screenshots`),
    );
  });

  it("reports reference problems with the file and path", () => {
    const raw = { site: siteJson, portfolio: structuredClone(portfolioJson), projects: structuredClone(projectsJson) } as Record<string, any>;
    raw.portfolio.education.push({ id: "bootcamp", institution: "Somewhere" });

    expect(() => loadContentFrom(raw as never, getAllMessages())).toThrowError(
      /messages en\.portfolio\.education\.bootcamp: Missing en copy/,
    );
  });
});

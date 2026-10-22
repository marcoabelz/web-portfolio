import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { leafPaths, MESSAGE_DOMAINS, type MessageNode } from "@/lib/admin/draft";
import { repoDraft } from "@/lib/admin/test-draft";

import type { EditorHandlers } from "./editor/EditorLayout";
import type { EditorState } from "./editor/state";
import { Fields, humanize, parseCopyPath } from "./Fields";

const handlers: EditorHandlers = {
  upload: async () => null,
  searchIcons: async () => [],
  review: () => {},
  signOut: () => {},
};

function state(): EditorState {
  const base = repoDraft();

  return { base, draft: base, baseSha: "sha", publicFiles: [], section: "other", query: "", previews: {} };
}

function render(paths: readonly string[]): string {
  return renderToStaticMarkup(<Fields paths={paths} state={state()} dispatch={() => {}} handlers={handlers} />);
}

function occurrences(markup: string, needle: string): number {
  return markup.split(needle).length - 1;
}

describe("other fields", () => {
  it("parses the uncovered path format into a copy reference", () => {
    expect(parseCopyPath("common.labels.portfolio")).toEqual({ domain: "common", path: ["labels", "portfolio"] });
    expect(parseCopyPath("projects.selected.satellyte.screenshots[2]")).toEqual({
      domain: "projects",
      path: ["selected", "satellyte", "screenshots", 2],
    });
    expect(parseCopyPath("nowhere.at.all")).toBeNull();
  });

  // Any leaf of the real catalogue that a future schema stops reaching must still be
  // editable in both languages here.
  it.each(MESSAGE_DOMAINS)("gives every %s.json leaf both languages", (domain) => {
    const paths = leafPaths(repoDraft().messages.en[domain] as MessageNode).map((path) => `${domain}.${path}`);
    const markup = render(paths);
    const boxes = occurrences(markup, "<input") + occurrences(markup, "<textarea");

    expect(paths.length).toBeGreaterThan(0);
    expect(boxes).toBe(paths.length * 2);
  });

  it("labels each field from its key and shows the path as the hint", () => {
    const markup = render(["common.labels.siteMetadataTitle"]);

    expect(markup).toContain("Site Metadata Title");
    expect(markup).toContain("common.labels.siteMetadataTitle");
  });

  it("renders nothing for an empty list", () => {
    expect(render([])).not.toContain("<input");
  });

  it("humanizes camel case keys", () => {
    expect(humanize("newHeading")).toBe("New Heading");
  });
});

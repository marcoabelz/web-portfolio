import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { countChanges, diffDraft } from "@/lib/admin/diff";
import { EDITOR_SECTIONS } from "@/lib/admin/schema";
import { repoDraft } from "@/lib/admin/test-draft";

import Loading from "../loading";
import { EditorLayout, type EditorHandlers } from "./EditorLayout";
import { editorReducer, type EditorAction, type EditorState } from "./state";

const handlers: EditorHandlers = {
  upload: async () => null,
  searchIcons: async () => [],
  review: () => {},
  signOut: () => {},
};

function initial(section = "hero"): EditorState {
  const base = repoDraft();

  return { base, draft: base, baseSha: "sha", publicFiles: [], section, query: "", previews: {} };
}

function apply(state: EditorState, ...actions: EditorAction[]): EditorState {
  return actions.reduce(editorReducer, state);
}

function render(state: EditorState, extra: { other?: boolean } = {}): string {
  return renderToStaticMarkup(
    <EditorLayout
      state={state}
      dispatch={() => {}}
      handlers={handlers}
      repo="owner/repo"
      branch="main"
      changes={countChanges(diffDraft(state.base, state.draft))}
      sections={
        extra.other
          ? [...EDITOR_SECTIONS, { id: "other", title: "Other", where: "Copy no section reaches", viewPath: "/", fields: [] }]
          : EDITOR_SECTIONS
      }
    />,
  );
}

function buttonTag(markup: string, action: string): string {
  return markup.match(new RegExp(`<button[^>]*data-action="${action}"[^>]*>`))?.[0] ?? "";
}

const copy = { domain: "portfolio", path: ["profile", "intro", "lead"] } as const;
const fact = { file: "site", path: ["heroFacts", "experience"] } as const;

describe("editor layout", () => {
  it("lists the twelve sections in order in the sidebar", () => {
    const markup = render(initial());
    const nav = markup.slice(markup.indexOf('data-sidebar="true"'));
    const ids = Array.from(nav.matchAll(/data-section-id="([^"]+)"/g)).map((match) => match[1]);

    expect(ids.slice(0, 12)).toEqual(EDITOR_SECTIONS.map((section) => section.id));
    expect(EDITOR_SECTIONS).toHaveLength(12);
  });

  it("marks only a changed section dirty", () => {
    const state = apply(initial(), { type: "setCopy", locale: "en", ref: copy, value: "Hello" });
    const markup = render(state);

    expect(markup).toMatch(/data-section-id="hero"[^>]*data-dirty="true"/);
    expect(markup).toMatch(/data-section-id="apps"[^>]*data-dirty="false"/);
  });

  it("puts Other last, only when given", () => {
    expect(render(initial())).not.toContain('data-section-id="other"');
    expect(render(initial(), { other: true })).toMatch(/data-section-id="layout"[\s\S]*data-section-id="other"/);
  });

  it("shows the title, where-line and a View site link for the active section", () => {
    const markup = render(initial("testimonials"));

    expect(markup).toContain("Shown when at least one exists");
    expect(markup).toMatch(/href="\/#testimonials"[^>]*target="_blank"|target="_blank"[^>]*href="\/#testimonials"/);
    expect(markup).toContain("View site");
    expect(markup).toContain('aria-label="Section"');
  });

  it("pins a save bar that counts changes and enables publishing", () => {
    const state = apply(
      initial(),
      { type: "setCopy", locale: "en", ref: copy, value: "Hello" },
      { type: "setCopy", locale: "id", ref: copy, value: "Halo" },
      { type: "setFact", ref: fact, value: "9 years" },
    );
    const markup = render(state);

    expect(markup).toContain("3 changes");
    expect(buttonTag(markup, "publish")).not.toContain(' disabled=""');
  });

  it("disables publishing and discarding at zero changes", () => {
    const markup = render(initial());

    expect(markup).toContain("No changes");
    expect(buttonTag(markup, "publish")).toContain(' disabled=""');
    expect(buttonTag(markup, "discard")).toContain(' disabled=""');
  });

  it("shows search matches instead of the panel while a query is set", () => {
    const markup = render(apply(initial(), { type: "search", query: "fastify" }));

    expect(markup).toContain('data-search-results="true"');
    expect(markup).toContain('data-result-section="stack"');
  });

  it("has a top bar with sign out and a search box", () => {
    const markup = render(initial());

    expect(markup).toContain("Sign out");
    expect(markup).toContain('type="search"');
  });
});

describe("admin loading", () => {
  it("is a busy skeleton", () => {
    expect(renderToStaticMarkup(<Loading />)).toContain('aria-busy="true"');
  });
});

function sourcesUnder(dir: URL): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);

    if (entry.isDirectory()) {
      return sourcesUnder(url);
    }

    return /\.tsx?$/.test(entry.name) ? [fileURLToPath(url)] : [];
  });
}

describe("editor boundaries", () => {
  const files = [
    ...sourcesUnder(new URL("./", import.meta.url)),
    fileURLToPath(new URL("../Fields.tsx", import.meta.url)),
  ];

  it("scans real files", () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it.each(files.map((file) => [file.split("/admin/")[1], file]))("%s does not import server actions", (_name, file) => {
    expect(readFileSync(file, "utf8")).not.toMatch(/from ["'](\.\.?\/)+actions["']|admin\/actions/);
  });
});

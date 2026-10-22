import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CollectionId } from "@/lib/content/collections";
import { EDITOR_SECTIONS, type CopyRef, type FieldDef } from "@/lib/admin/schema";
import { appSlugWith, repoDraft } from "@/lib/admin/test-draft";

import type { EditorHandlers } from "../EditorLayout";
import { editorReducer, type EditorAction, type EditorState } from "../state";
import { CollectionEntry } from "./CollectionField";
import { FieldRenderer } from "./FieldRenderer";
import { shapeAction } from "./SelectField";
import { addTags, placeholderStatus, translationStatus } from "./shared";

const handlers: EditorHandlers = {
  upload: async () => null,
  searchIcons: async () => [],
  review: () => {},
  signOut: () => {},
};

function initial(): EditorState {
  const base = repoDraft();

  return { base, draft: base, baseSha: "sha", publicFiles: [], section: "hero", query: "", previews: {} };
}

// Rules, not copy: entries are picked from the content by kind, so editing the real
// apps or roles in /admin cannot turn these tests red.
const REPO = repoDraft();
const PUBLIC_APP = appSlugWith(REPO, "public");
const PRIVATE_APP = appSlugWith(REPO, "private");
const FIRST_ROLE = REPO.content.portfolio.experiences[0];

function apply(state: EditorState, ...actions: EditorAction[]): EditorState {
  return actions.reduce(editorReducer, state);
}

function render(node: JSX.Element): string {
  return renderToStaticMarkup(node);
}

function field(state: EditorState, def: FieldDef, scope: { copyBase: (string | number)[]; factBase?: (string | number)[] } = { copyBase: [] }) {
  return <FieldRenderer field={def} scope={scope} state={state} dispatch={() => {}} handlers={handlers} />;
}

function findField(sectionId: string, label: string): FieldDef {
  const section = EDITOR_SECTIONS.find((candidate) => candidate.id === sectionId);
  const found = section?.fields.find((candidate) => candidate.label === label);

  if (!found) {
    throw new Error(`No field ${label} in ${sectionId}`);
  }

  return found;
}

const servicesTitle: CopyRef = { domain: "common", path: ["sections", "services", "title"] };

function copyField(values: { en: string; id: string }) {
  const state = apply(
    initial(),
    { type: "setCopy", locale: "en", ref: servicesTitle, value: values.en },
    { type: "setCopy", locale: "id", ref: servicesTitle, value: values.id },
  );

  return field(state, { kind: "text", label: "Section title", copy: servicesTitle });
}

function textListField(options: { fixed: boolean }) {
  return field(
    initial(),
    { kind: "textList", label: "Screenshot captions", copy: { domain: "projects", path: ["screenshots"] }, fixed: options.fixed },
    {
      copyBase: ["selected", PUBLIC_APP],
      factBase: ["selected", REPO.content.projects.selected.findIndex((app) => app.slug === PUBLIC_APP)],
    },
  );
}

const appsCollection = findField("apps", "Apps") as Extract<FieldDef, { kind: "collection" }>;

function appEntry(slug: string, state = initial()) {
  return (
    <CollectionEntry
      field={appsCollection}
      id={slug}
      index={state.draft.content.projects.selected.findIndex((app) => app.slug === slug)}
      count={state.draft.content.projects.selected.length}
      title={slug}
      state={state}
      dispatch={() => {}}
      handlers={handlers}
      defaultOpen
    />
  );
}

function sectionsField() {
  return field(initial(), findField("layout", "Homepage sections"));
}

function collectionField(collection: CollectionId, state = initial()) {
  const def = EDITOR_SECTIONS.flatMap((section) => section.fields).find(
    (candidate) => candidate.kind === "collection" && candidate.collection === collection,
  );

  return field(state, def as FieldDef);
}

describe("field components", () => {
  it("flags untranslated copy", () => {
    expect(render(copyField({ en: "Services", id: "Services" }))).toContain("Untranslated");
  });

  it("does not flag copy that has its own Indonesian", () => {
    expect(render(copyField({ en: "Services", id: "Layanan" }))).not.toContain("Untranslated");
  });

  it("shows placeholders as tokens and warns when they differ", () => {
    const html = render(copyField({ en: "Based in {location}", id: "Domisili" }));
    expect(html).toContain("{location}");
    expect(html).toContain("Placeholders differ");
  });

  it("fixed text lists have no add, remove, or move buttons", () => {
    const html = render(textListField({ fixed: true }));
    expect(html).not.toMatch(/Add|Remove|Move/);
    expect(html).toContain("<input");
  });

  it("free text lists can add, remove, and move", () => {
    expect(render(textListField({ fixed: false }))).toMatch(/Add[\s\S]*Remove|Remove[\s\S]*Add/);
  });

  it("hides the live URL but shows screenshots for a private app", () => {
    expect(render(appEntry(PRIVATE_APP))).not.toMatch(/Live URL/);
    expect(render(appEntry(PRIVATE_APP))).toMatch(/Screenshots/);
    expect(render(appEntry(PUBLIC_APP))).toMatch(/Live URL[\s\S]*Screenshots/);
  });

  it("keeps the image cover option for a private app", () => {
    const index = REPO.content.projects.selected.findIndex((app) => app.slug === PRIVATE_APP);
    const state = apply(initial(), {
      type: "setCoverKind",
      ref: { file: "projects", path: ["selected", index, "cover"] },
      kind: "image",
    });
    expect(render(appEntry(PRIVATE_APP, state))).toContain("Cover image");
  });

  it("section toggles expose their state", () => {
    const html = render(sectionsField());
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/aria-pressed=/g)).toHaveLength(REPO.content.site.sections.length);
  });

  it("collections render collapsed entry cards with their titles", () => {
    const html = render(collectionField("experiences"));
    expect(html.indexOf('aria-expanded="false"')).toBeGreaterThan(-1);
    expect(html.indexOf(FIRST_ROLE.company)).toBeGreaterThan(html.indexOf('aria-expanded="false"'));
  });

  it("an empty collection still offers Add", () => {
    const html = render(collectionField("testimonials"));
    expect(html).toContain("No entries yet");
    expect(html).toMatch(/>Add</);
  });

  it("marks a changed field and labels its reset for both languages", () => {
    const html = render(copyField({ en: "Changed", id: "Diubah" }));
    expect(html).toContain("Changed");
    expect(html).toMatch(/aria-label="Reset Section title in both languages"[^>]*>[\s\S]*?Reset<\/button>/);
  });

  it("an untouched field has no reset button", () => {
    expect(render(field(initial(), { kind: "text", label: "Section title", copy: servicesTitle }))).not.toContain(">Reset<");
  });

  it("pairs the English and Indonesian inputs with labels", () => {
    const html = render(copyField({ en: "Services", id: "Layanan" }));
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>English/);
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>Indonesian/);
  });

  it("warns inline when a URL fact is not https", () => {
    const ref = { file: "site", path: ["socialLinks", { id: "gitHub" }, "href"] } as const;
    const state = apply(initial(), { type: "setFact", ref, value: "http://github.com/x" });
    const html = render(field(state, findField("contact", "GitHub link")));
    expect(html).toContain("Must start with https://");
    expect(html).toContain('aria-invalid="true"');
  });

  it("offers Present for a current role and keeps the month input", () => {
    const current = apply(initial(), { type: "setFact", ref: { file: "portfolio", path: ["experiences", 0, "endDate"] }, value: null });
    const html = render(
      field(current, { kind: "month", label: "End", fact: { file: "portfolio", path: ["endDate"] }, allowPresent: true }, {
        copyBase: ["experiences", FIRST_ROLE.id],
        factBase: ["experiences", 0],
      }),
    );
    expect(html).toContain('type="month"');
    expect(html).toMatch(/type="checkbox"[^>]*checked=""|checked=""[^>]*type="checkbox"/);
    expect(html).toContain("Present");
  });

  it("tags show chips with remove buttons and suggest known skill names", () => {
    const html = render(field(initial(), findField("stack", "Daily stack")));
    expect(html).toContain('aria-label="Remove Next.js"');
    expect(html).toMatch(/<datalist[\s\S]*value="Playwright"/);
  });

  it("previews a pending image upload from previews", () => {
    const state = { ...initial(), previews: { "/media/portrait.jpg": "blob:preview" } };
    const html = render(field(state, findField("hero", "Portrait")));
    expect(html).toContain('src="blob:preview"');
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/avif"');
    expect(html).toContain("Replace");
  });

  it("renders the icon list with sprite logos and monograms", () => {
    const html = render(field(initial(), findField("stack", "Skill icons")));
    expect(html).toContain("#si-nextdotjs");
    expect(html).toMatch(/chip-mono[^>]*>BQ</);
  });

  it("uses the CV path from the draft", () => {
    const html = render(field(initial(), findField("hero", "CV (PDF)")));
    expect(html).toContain(REPO.content.site.profile.resumePath.split("/").pop()!);
    expect(html).toContain('accept="application/pdf"');
  });
});

describe("a new entry", () => {
  it("shows every field of a first testimonial", () => {
    const state = apply(initial(), { type: "addEntry", collection: "testimonials", seed: { name: "Jane Doe" } });
    const field = EDITOR_SECTIONS.flatMap((section) => section.fields).find(
      (candidate) => candidate.kind === "collection" && candidate.collection === "testimonials",
    ) as Extract<FieldDef, { kind: "collection" }>;
    const html = render(
      <CollectionEntry field={field} id="jane-doe" index={0} count={1} title="Jane Doe" state={state} dispatch={() => {}} handlers={handlers} defaultOpen />,
    );

    for (const label of ["Name", "Company", "Role", "Quote"]) {
      expect(html).toContain(`>${label}</`);
    }
    expect(html).toContain('value="Jane Doe"');
    expect(html).toContain("New");
  });
});

describe("field helpers", () => {
  it("routes privacy and lab source selects to shape-swapping actions", () => {
    const state = initial();
    expect(shapeAction({ file: "projects", path: ["selected", 0, "privacy"] }, "private", state)).toEqual({
      type: "setAppPrivacy",
      slug: REPO.content.projects.selected[0].slug,
      privacy: "private",
    });
    expect(shapeAction({ file: "portfolio", path: ["lab", 0, "source"] }, "repo", state)).toEqual({
      type: "setLabSource",
      id: REPO.content.portfolio.lab[0].id,
      source: "repo",
    });
    expect(shapeAction({ file: "portfolio", path: ["experiences", 0, "workMode"] }, "remote", state)).toBeNull();
  });

  it("counts untranslated only when Indonesian is empty or equal", () => {
    expect(translationStatus("Services", "")).toBe("untranslated");
    expect(translationStatus("Services", "Services")).toBe("untranslated");
    expect(translationStatus("Services", "Layanan")).toBe("ok");
    expect(translationStatus("", "")).toBe("ok");
  });

  it("compares placeholders in both languages", () => {
    expect(placeholderStatus("Hi {name}", "Halo {name}")).toEqual({ tokens: ["{name}"], differ: false });
    expect(placeholderStatus("Hi {name}", "Halo")).toEqual({ tokens: ["{name}"], differ: true });
  });

  it("adds tags from typed text, skipping blanks and duplicates", () => {
    expect(addTags(["React"], "Vue, React,  ,Svelte")).toEqual(["React", "Vue", "Svelte"]);
  });
});

import type { MessageDomain } from "@/i18n/messages";

import { leafPaths, type MessageNode, type NodePath } from "@/lib/content/catalog";
import { COLLECTIONS, type CollectionDef, type CollectionId } from "@/lib/content/collections";
import type { ContentFileName } from "@/lib/content/schema";

import type { ContentDraft } from "./draft";

// The one file that describes the editor: sections of typed fields, each mapped to a
// content fact or a message key. Labels and hints are English editor chrome, not
// messages. Anything the schema does not mention is found by uncoveredCopyPaths and
// uncoveredFactPaths, so the UI can list it under "Other" instead of hiding it.

export type CopyRef = { domain: MessageDomain; path: NodePath }; // inside a collection, relative to the entry's copy
// A fact path segment is a key, an array index, or {id}: the array element whose `id`
// matches, so a field stays on the same entry when the file is reordered.
export type FactSegment = string | number | { id: string };
export type FactRef = { file: ContentFileName; path: readonly FactSegment[] }; // inside a collection, relative to the entry's facts // inside a collection, relative to the entry's facts

type Base = {
  label: string;
  hint?: string;
  // Show the field only while a fact of the same entry (or section) has this value,
  // for example the live URL of a public app.
  showWhen?: { fact: FactRef; equals: string };
  // The field's copy key exists only on entries whose fact list at this path is non-empty
  // (screenshot captions), so only those entries have to resolve it.
  filledBy?: FactRef;
  // Fact paths this field owns but does not edit, such as the fixed id beside a link.
  covers?: readonly FactRef[];
  // The fact is an optional key that every entry may leave out (an archive project's
  // repository URL), so no entry having it is not a schema error.
  optional?: boolean;
};

export type FieldDef =
  | (Base & { kind: "text" | "paragraph"; copy: CopyRef; softLimit?: number })
  | (Base & { kind: "fact"; input: "text" | "url" | "email"; fact: FactRef })
  | (Base & { kind: "month"; fact: FactRef; allowPresent?: boolean })
  | (Base & { kind: "select"; fact: FactRef; options: readonly { value: string; label: string }[] })
  | (Base & { kind: "toggle"; fact: FactRef })
  | (Base & { kind: "tags"; fact: FactRef })
  // `fact` points at one image object or at an array of them (a gallery).
  | (Base & { kind: "image"; fact: FactRef; alt?: CopyRef })
  | (Base & { kind: "resume" })
  | (Base & { kind: "icon"; fact: FactRef })
  | (Base & { kind: "textList"; copy: CopyRef; fixed?: boolean })
  // `item` fields use paths relative to one list item ([] for a list of plain strings).
  | (Base & { kind: "copyList"; copy: CopyRef; item: readonly FieldDef[]; template: MessageNode })
  | (Base & { kind: "collection"; collection: CollectionId; titleFrom: FactRef; fields: readonly FieldDef[] })
  | (Base & { kind: "sections" });

export type SectionDef = {
  id: string;
  title: string;
  where: string;
  viewPath: string;
  fields: readonly FieldDef[];
};

// ---------------------------------------------------------------- builders

const copy = (domain: MessageDomain, ...path: (string | number)[]): CopyRef => ({ domain, path });
const fact = (file: ContentFileName, ...path: FactSegment[]): FactRef => ({ file, path });
const common = (...path: string[]) => copy("common", ...path);
const portfolio = (...path: string[]) => copy("portfolio", ...path);
const projects = (...path: string[]) => copy("projects", ...path);

type Opts = { hint?: string; softLimit?: number };

const text = (label: string, ref: CopyRef, o: Opts = {}): FieldDef => ({ kind: "text", label, copy: ref, ...o });
const para = (label: string, ref: CopyRef, o: Opts = {}): FieldDef => ({
  kind: "paragraph",
  label,
  copy: ref,
  softLimit: 320,
  ...o,
});
const line = (label: string, ref: CopyRef, o: Opts = {}): FieldDef => text(label, ref, { softLimit: 160, ...o });
const plain = (label: string, ref: FactRef, input: "text" | "url" | "email" = "text", hint?: string): FieldDef => ({
  kind: "fact",
  label,
  fact: ref,
  input,
  hint,
});
const tags = (label: string, ref: FactRef, hint?: string): FieldDef => ({ kind: "tags", label, fact: ref, hint });
const select = (
  label: string,
  ref: FactRef,
  options: readonly [string, string][],
  hint?: string,
): FieldDef => ({
  kind: "select",
  label,
  fact: ref,
  hint,
  options: options.map(([value, optionLabel]) => ({ value, label: optionLabel })),
});
const textItems = (label: string, ref: CopyRef, hint?: string): FieldDef => ({
  kind: "copyList",
  label,
  copy: ref,
  hint,
  template: "",
  item: [para("Text", { domain: ref.domain, path: [] })],
});

// Labelled one-line texts that live side by side under one message group.
function group(domain: MessageDomain, base: string[], entries: Record<string, string | [string, string]>): FieldDef[] {
  return Object.entries(entries).map(([key, value]) => {
    const [label, hint] = Array.isArray(value) ? value : [value, undefined];
    return text(label, copy(domain, ...base, key), { hint });
  });
}

// ---------------------------------------------------------------- sections

const CONTEXTS: [string, string][] = [
  ["production", "Production"],
  ["commercial", "Commercial"],
  ["internal", "Internal"],
];

const siteFields: FieldDef[] = [
  plain("Full name", fact("site", "profile", "name"), "text", "Used in the header, page titles, and the footer"),
  plain("Nickname", fact("site", "profile", "nickname"), "text", "Short name for tight spaces"),
  plain("Email", fact("site", "profile", "email"), "email", "Where the contact buttons send mail"),
  plain("City", fact("site", "profile", "city")),
  plain("Country", fact("site", "profile", "country")),
  plain("Timezone", fact("site", "profile", "timezone"), "text", "Shown after the country, e.g. GMT+7"),
  ...group("common", ["navigation"], {
    apps: "Nav: apps",
    about: "Nav: about",
    services: "Nav: services",
    experience: "Nav: experience",
    contact: "Nav: contact",
    resume: "Nav: CV link",
  }),
  line("Site title", common("labels", "siteMetadataTitle"), { hint: "Browser tab and search results. {name} becomes your name" }),
  para("Site description", common("labels", "siteMetadataDescription"), { hint: "Search result snippet and link previews" }),
  text("Portfolio label", common("labels", "portfolio")),
  text("Footer text", common("footer", "copyright"), { hint: "Keep the placeholders in braces as they are" }),
  text("Back to top button", common("actions", "backToTop")),
  ...group("common", ["language"], {
    current: "Language: current",
    english: "Language: English name",
    indonesian: "Language: Indonesian name",
    switchTo: "Language: switch to",
    selector: "Language: selector label",
  }),
  ...group("common", ["accessibility"], {
    skipToMainContent: ["Skip link", "Read aloud by screen readers; not visible to most visitors"],
    scrollToTop: "Scroll to top",
    home: "Home link",
    logo: "Logo",
    primaryNavigation: "Primary navigation",
    mobileNavigation: "Mobile navigation",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    technologyStack: "Technology stack",
    experienceTechnologyStack: "Experience technology stack",
    projectHighlights: "Project highlights",
    openLiveProduct: "Open live app",
    enlargeScreenshot: "Enlarge screenshot",
    closeScreenshot: "Close screenshot",
    openRepository: "Open repository",
    opensInNewTab: "Opens in a new tab",
    switchToLightMode: "Switch to light mode",
    switchToDarkMode: "Switch to dark mode",
    toggleColorTheme: "Toggle color theme",
  }),
];

const heroFields: FieldDef[] = [
  line("Job title", portfolio("profile", "title"), { hint: "Shown under your name on the homepage" }),
  line("Specialty", portfolio("profile", "specialty"), { hint: "One short line about what you do best" }),
  line("Intro, first part", portfolio("profile", "intro", "lead"), { hint: "Shown in white" }),
  line("Intro, second part", portfolio("profile", "intro", "tail"), { hint: "Shown in grey after the first part" }),
  line("Availability note", portfolio("profile", "availability"), { hint: "Next to the green dot" }),
  text("Availability label", common("labels", "availability")),
  { kind: "image", label: "Portrait", fact: fact("site", "profile", "portrait"), hint: "Square or portrait photo, converted to WebP" },
  { kind: "resume", label: "CV (PDF)", hint: "Replaces the file behind the download button" },
  text("View apps button", common("actions", "viewApps")),
  text("Start a project button", common("actions", "startProject")),
  text("Download CV button", common("actions", "downloadResume")),
  plain("Years of experience", fact("site", "heroFacts", "experience"), "text", "The number shown in the facts row"),
  plain("Products shipped", fact("site", "heroFacts", "shipped"), "text", "The number shown in the facts row"),
  ...group("common", ["sections", "facts"], {
    experienceLabel: "Experience fact: label",
    experienceCaption: "Experience fact: caption",
    shippedLabel: "Shipped fact: label",
    shippedCaption: "Shipped fact: caption",
    basedInLabel: "Based in label",
  }),
];

// Inside a collection, fact and copy paths are relative to the entry.
const PUBLIC_ONLY = { fact: fact("projects", "privacy"), equals: "public" } as const;
const IMAGE_COVER = { fact: fact("projects", "cover", "kind"), equals: "image" } as const;

const appFields: FieldDef[] = [
  plain("Name", fact("projects", "name")),
  plain("Years", fact("projects", "years"), "text", "For example 2025 to 2026"),
  select("Context", fact("projects", "contextId"), CONTEXTS),
  select("Privacy", fact("projects", "privacy"), [["public", "Public"], ["private", "Private"]], "Private apps have no live link and may show screenshots only of invented dummy data"),
  { ...plain("Live URL", fact("projects", "liveUrl"), "url", "Where the View app button goes"), showWhen: PUBLIC_ONLY },
  tags("Stack", fact("projects", "stack"), "Technologies shown on the card and case study"),
  // B8 maps "Pattern" to cover.kind "pattern" (then the variant select applies) and
  // "Image" to cover.kind "image". Private apps may use either.
  select("Cover", fact("projects", "cover", "kind"), [["pattern", "Pattern"], ["image", "Image"]], "An image cover leads the homepage card when the app has screenshots. Images may be screenshots of invented dummy data only: never real data or client branding"),
  {
    ...select("Pattern", fact("projects", "cover", "variant"), [["signal", "Signal"], ["vision", "Vision"], ["talent", "Talent"], ["telemetry", "Telemetry"]]),
    showWhen: { fact: fact("projects", "cover", "kind"), equals: "pattern" },
  },
  { kind: "image", label: "Cover image", fact: fact("projects", "cover"), alt: projects("cover", "alt"), showWhen: IMAGE_COVER },
  line("Descriptor", projects("descriptor"), { hint: "One line under the app name" }),
  line("Context label", projects("contextLabel")),
  line("Your role", projects("role")),
  line("Outcome", projects("outcome")),
  textItems("Highlights", projects("highlights"), "Short bullet points on the card"),
  textItems("About the app", projects("caseStudy", "overview"), "Case study paragraphs"),
  textItems("Features", projects("caseStudy", "features")),
  textItems("Responsibilities", projects("caseStudy", "responsibilities")),
  { kind: "image", label: "Screenshots", fact: fact("projects", "screenshots"), hint: "Private apps: dummy data only, no client name, logo, or person. Same order as the captions" },
  {
    kind: "textList",
    label: "Screenshot captions",
    copy: projects("screenshots"),
    fixed: true,
    hint: "Each caption pairs with the screenshot in the same position",
    filledBy: fact("projects", "screenshots"),
  },
];

const archiveFields: FieldDef[] = [
  plain("Name", fact("projects", "name")),
  select("Context", fact("projects", "contextId"), [["commercial", "Commercial"], ["training", "Training"]]),
  tags("Stack", fact("projects", "stack")),
  { kind: "image", label: "Cover image", fact: fact("projects", "cover"), alt: projects("coverAlt") },
  { ...plain("Repository URL", fact("projects", "repositoryUrl"), "url", "Leave empty when the code is private"), optional: true },
  line("Descriptor", projects("descriptor"), { hint: "One line under the project name" }),
  line("Context label", projects("contextLabel")),
];

const experienceFields: FieldDef[] = [
  plain("Company", fact("portfolio", "company")),
  plain("Location", fact("portfolio", "location")),
  select("Work mode", fact("portfolio", "workMode"), [["onsite", "On-site"], ["hybrid", "Hybrid"], ["remote", "Remote"]]),
  { kind: "month", label: "Start", fact: fact("portfolio", "startDate") },
  { kind: "month", label: "End", fact: fact("portfolio", "endDate"), allowPresent: true, hint: "Choose Present for a current role" },
  line("Role title", portfolio("title")),
  para("Summary", portfolio("summary")),
  textItems("Highlights", portfolio("highlights"), "Shown when the row is expanded"),
  tags("Stack", fact("portfolio", "stack")),
];

const SEARCH_ICON_HINT = "Search Simple Icons; leave empty to show a monogram";

export const EDITOR_SECTIONS: readonly SectionDef[] = [
  {
    id: "site",
    title: "Site & navigation",
    where: "Navigation, metadata, accessibility labels, footer",
    viewPath: "/",
    fields: siteFields,
  },
  {
    id: "hero",
    title: "Hero",
    where: "Top of the homepage",
    viewPath: "/",
    fields: heroFields,
  },
  {
    id: "apps",
    title: "Apps",
    where: "Selected apps and their case studies",
    viewPath: "/#apps",
    fields: [
      line("Section title", common("sections", "apps", "title")),
      line("Section description", common("sections", "apps", "description")),
      line("Private apps note", common("sections", "apps", "privateNote")),
      text("Live badge", common("sections", "apps", "live")),
      text("Private system label", common("labels", "privateProductionSystem")),
      text("Sanitized cover label", common("labels", "sanitizedVisual")),
      line("Sanitized cover description", common("labels", "sanitizedVisualDescription")),
      text("Repository unavailable label", common("labels", "repositoryUnavailable")),
      text("View case study button", common("actions", "viewCaseStudy")),
      text("View app button", common("actions", "liveProduct")),
      text("Repository button", common("actions", "repository")),
      line("Case study page title", common("labels", "caseStudyMetadataTitle"), { hint: "{projectName} becomes the app name" }),
      ...group("common", ["caseStudy"], { context: "Case study: context", role: "Case study: role", relatedWork: "Case study: other apps" }),
      ...group("common", ["caseStudy", "sections"], {
        overview: "Heading: about the app",
        features: "Heading: features",
        role: "Heading: responsibilities",
        stack: "Heading: technology stack",
        screenshots: "Heading: screenshots",
      }),
      { kind: "collection", label: "Apps", collection: "selectedApps", titleFrom: fact("projects", "name"), fields: appFields },
    ],
  },
  {
    id: "archive",
    title: "Archive",
    where: "The earlier projects page",
    viewPath: "/work/archive",
    fields: [
      text("Eyebrow", common("sections", "archive", "eyebrow")),
      text("Page title", common("sections", "archive", "title")),
      line("Page description", common("sections", "archive", "description")),
      text("Browse button", common("actions", "browseEarlierProjects")),
      text("Back button", common("actions", "backToSelectedWork")),
      text("Search title", common("labels", "projectArchiveMetadataTitle")),
      line("Search description", common("labels", "projectArchiveMetadataDescription"), { hint: "{name} becomes your name" }),
      { kind: "collection", label: "Projects", collection: "archiveProjects", titleFrom: fact("projects", "name"), fields: archiveFields },
    ],
  },
  {
    id: "about",
    title: "About",
    where: "About section",
    viewPath: "/#about",
    fields: [
      text("Section title", common("sections", "about", "title")),
      textItems("About paragraphs", portfolio("aboutParagraphs"), "One paragraph per item"),
      text("Education heading", common("sections", "about", "education")),
      {
        kind: "collection",
        label: "Education",
        collection: "education",
        titleFrom: fact("portfolio", "institution"),
        fields: [
          plain("Institution", fact("portfolio", "institution")),
          line("Program", portfolio("program")),
          line("Period", portfolio("period")),
          line("Result", portfolio("result")),
        ],
      },
      text("Languages heading", common("sections", "about", "languages")),
      {
        kind: "collection",
        label: "Languages",
        collection: "languages",
        titleFrom: fact("portfolio", "id"),
        fields: [
          line("Language", portfolio("name")),
          line("Proficiency", portfolio("proficiency")),
          line("Evidence", portfolio("evidence"), { hint: "Optional, for example a test score" }),
        ],
      },
    ],
  },
  {
    id: "services",
    title: "Services",
    where: "Services and process",
    viewPath: "/#services",
    fields: [
      text("Section title", common("sections", "services", "title")),
      line("Section description", common("sections", "services", "description")),
      {
        kind: "collection",
        label: "Services",
        collection: "services",
        titleFrom: fact("portfolio", "id"),
        fields: [
          line("Title", portfolio("title")),
          line("Description", portfolio("description")),
          tags("Tags", fact("portfolio", "tags")),
        ],
      },
      text("Process heading", common("sections", "services", "process")),
      text("Step label", common("sections", "services", "step"), { hint: "Keep {number} where the step number goes" }),
      {
        kind: "copyList",
        label: "Process steps",
        copy: portfolio("process"),
        template: { title: "", description: "" },
        item: [line("Step title", portfolio("title")), line("Step description", portfolio("description"))],
      },
    ],
  },
  {
    id: "experience",
    title: "Experience",
    where: "Experience rows",
    viewPath: "/#experience",
    fields: [
      text("Section title", common("sections", "experience", "title")),
      line("Section description", common("sections", "experience", "description")),
      ...group("common", ["sections", "experience"], {
        present: ["Present label", "Shown instead of an end date for a current role"],
        showDetails: "Show details button",
        hideDetails: "Hide details button",
        highlightsLabel: "Highlights label",
        stackLabel: "Stack label",
      }),
      ...group("common", ["labels", "workMode"], { onsite: "On-site label", hybrid: "Hybrid label", remote: "Remote label" }),
      { kind: "collection", label: "Roles", collection: "experiences", titleFrom: fact("portfolio", "company"), fields: experienceFields },
    ],
  },
  {
    id: "stack",
    title: "Stack",
    where: "Skill groups, icons, daily stack",
    viewPath: "/#stack",
    fields: [
      text("Section title", common("sections", "stack", "title")),
      line("Section description", common("sections", "stack", "description")),
      text("Daily stack heading", common("sections", "facts", "dailyStack")),
      tags("Daily stack", fact("site", "dailyStack"), "The short list shown beside the hero"),
      {
        kind: "collection",
        label: "Skill groups",
        collection: "skillGroups",
        titleFrom: fact("portfolio", "id"),
        fields: [text("Group title", portfolio()), tags("Skills", fact("portfolio", "skills"))],
      },
      { kind: "icon", label: "Skill icons", fact: fact("portfolio", "skillIcons"), hint: SEARCH_ICON_HINT },
    ],
  },
  {
    id: "testimonials",
    title: "Testimonials",
    where: "Shown when at least one exists",
    viewPath: "/#testimonials",
    fields: [
      text("Section title", common("sections", "testimonials", "title")),
      {
        kind: "collection",
        label: "Testimonials",
        collection: "testimonials",
        titleFrom: fact("portfolio", "name"),
        fields: [
          plain("Name", fact("portfolio", "name")),
          plain("Company", fact("portfolio", "company")),
          line("Role", portfolio("role")),
          para("Quote", portfolio("quote"), { hint: "Only add real quotes from real people" }),
        ],
      },
    ],
  },
  {
    id: "lab",
    title: "Lab",
    where: "Public repositories",
    viewPath: "/#lab",
    fields: [
      text("Section title", common("sections", "lab", "title")),
      line("Section description", common("sections", "lab", "description")),
      {
        kind: "collection",
        label: "Repositories",
        collection: "lab",
        titleFrom: fact("portfolio", "name"),
        fields: [
          select("Source", fact("portfolio", "source"), [["repo", "GitHub repository"], ["archive", "Archive project"]], "Archive entries borrow their text from the archive"),
          { ...plain("Archive project id", fact("portfolio", "archiveId"), "text", "The id of a project in the Archive"), showWhen: { fact: fact("portfolio", "source"), equals: "archive" } },
          { ...plain("Repository name", fact("portfolio", "name")), showWhen: { fact: fact("portfolio", "source"), equals: "repo" } },
          { ...plain("Repository URL", fact("portfolio", "url"), "url", "Must start with https://github.com/"), showWhen: { fact: fact("portfolio", "source"), equals: "repo" } },
          { ...tags("Stack", fact("portfolio", "stack")), showWhen: { fact: fact("portfolio", "source"), equals: "repo" } },
          { ...line("Description", portfolio("description")), showWhen: { fact: fact("portfolio", "source"), equals: "repo" } },
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    where: "Contact block and social links",
    viewPath: "/#contact",
    fields: [
      text("Label", common("sections", "contact", "label")),
      text("Title, first part", common("sections", "contact", "titleLead")),
      text("Title, accent part", common("sections", "contact", "titleAccent"), { hint: "Shown in the accent colour" }),
      ...group("common", ["sections", "contact", "hiring"], { label: "Hiring: label", title: "Hiring: title", description: "Hiring: description" }),
      ...group("common", ["sections", "contact", "freelance"], { label: "Freelance: label", title: "Freelance: title", description: "Freelance: description" }),
      text("Email button", common("actions", "emailMe")),
      // Bound by id, so reordering site.json cannot move a field onto another link.
      { ...plain("Email link", fact("site", "socialLinks", { id: "email" }, "href"), "text", "Starts with mailto:"), covers: [fact("site", "socialLinks", { id: "email" }, "id")] },
      { ...plain("LinkedIn link", fact("site", "socialLinks", { id: "linkedIn" }, "href"), "url"), covers: [fact("site", "socialLinks", { id: "linkedIn" }, "id")] },
      { ...plain("GitHub link", fact("site", "socialLinks", { id: "gitHub" }, "href"), "url"), covers: [fact("site", "socialLinks", { id: "gitHub" }, "id")] },
      { ...plain("WhatsApp link", fact("site", "socialLinks", { id: "whatsApp" }, "href"), "url"), covers: [fact("site", "socialLinks", { id: "whatsApp" }, "id")] },
    ],
  },
  {
    id: "layout",
    title: "Page layout",
    where: "Section order and visibility",
    viewPath: "/",
    fields: [{ kind: "sections", label: "Homepage sections", hint: "Move up or down to reorder; hidden sections vanish from the page and the numbering" }],
  },
];

// ---------------------------------------------------------------- coverage
//
// Every field is expanded into "checks": one per copy or fact path it points at. A
// field inside a collection expands once per entry of the real draft, so a leaf is
// covered only when some entry's field reaches it. Fields claim only the leaves they
// edit: a text claims its string, an image claims src/width/height, a list of strings
// claims every string under it, a list of objects claims nothing itself and leaves it
// to its item fields. So a new key inside a list item or inside `cover` is reported
// instead of being swallowed by its parent. A check is "dangling" when its path
// resolves nowhere (in no entry; for a collection with no entries yet, not in its blank
// item; for copy, in either locale).

type Locale = "en" | "id";
const LOCALES: readonly Locale[] = ["en", "id"];
const DOMAINS: readonly MessageDomain[] = ["common", "portfolio", "projects"];

// exact: the leaf at the path. under: every string below it. keys: these keys of the
// object (or of each object in the array) at the path.
type Claim = "none" | "exact" | "under" | readonly string[];

type Check = {
  kind: "copy" | "fact";
  space: string; // message domain or content file name
  rel: readonly FactSegment[]; // where the field points, relative to its entry
  instances: NodePath[]; // absolute paths, one per entry (or list item) in scope
  template?: MessageNode; // blank shape used when there is no instance to look at
  claim: Claim;
  wrongSpace: boolean; // the field names a different domain or file than its collection
  // For a field with showWhen: whether each instance's entry currently has that kind.
  // Only active instances have to resolve, and none active means nothing to look at.
  active?: boolean[];
  // The field is optional: an absent key on every entry is allowed.
  optional?: boolean;
};

type Scope = {
  copySpace?: MessageDomain;
  copyBases: NodePath[];
  copyTemplate?: MessageNode;
  factSpace?: ContentFileName;
  factBases: NodePath[];
};

export function pathText(path: readonly FactSegment[]): string {
  return path.reduce<string>((out, part) => {
    if (typeof part === "number") {
      return `${out}[${part}]`;
    }

    const key = typeof part === "object" ? `[id=${part.id}]` : part;
    return typeof part === "object" ? `${out}${key}` : out ? `${out}.${key}` : key;
  }, "");
}

function getAt(node: unknown, path: NodePath): unknown {
  let current = node;

  for (const part of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string | number, unknown>)[part];
  }

  return current;
}

// Turns {id} segments into array indexes against the real file. Undefined when no
// element has that id.
export function resolveFactPath(root: unknown, path: readonly FactSegment[]): NodePath | undefined {
  const out: (string | number)[] = [];
  let current = root;

  for (const part of path) {
    if (typeof part === "object") {
      if (!Array.isArray(current)) {
        return undefined;
      }

      const index = current.findIndex(
        (entry) => entry !== null && typeof entry === "object" && (entry as { id?: unknown }).id === part.id,
      );

      if (index < 0) {
        return undefined;
      }

      out.push(index);
      current = current[index];
    } else {
      out.push(part);
      current = current !== null && typeof current === "object" ? (current as Record<string | number, unknown>)[part] : undefined;
    }
  }

  return out;
}

function copyCheck(ref: CopyRef, scope: Scope, claim: Claim): Check {
  const wrongSpace = scope.copySpace !== undefined && scope.copySpace !== ref.domain;

  return {
    kind: "copy",
    space: scope.copySpace ?? ref.domain,
    rel: ref.path,
    instances: scope.copyBases.map((base) => [...base, ...ref.path]),
    template: scope.copyTemplate,
    claim: wrongSpace ? "none" : claim,
    wrongSpace,
  };
}

function factCheck(ref: FactRef, scope: Scope, claim: Claim, draft: ContentDraft): Check {
  const wrongSpace = scope.factSpace !== undefined && scope.factSpace !== ref.file;
  const space = scope.factSpace ?? ref.file;

  return {
    kind: "fact",
    space,
    rel: ref.path,
    instances: scope.factBases.map((base) => {
      const full = [...base, ...ref.path];
      // An id that matches nothing becomes index -1, which resolves to nothing.
      return (
        resolveFactPath(draft.content[ref.file], full) ??
        full.map((part) => (typeof part === "object" ? -1 : part))
      );
    }),
    claim: wrongSpace ? "none" : claim,
    wrongSpace,
  };
}

const TOP: Scope = { copyBases: [[]], factBases: [[]] };

function collectionDef(id: CollectionId): CollectionDef {
  const def = COLLECTIONS.find((candidate) => candidate.id === id);

  if (!def) {
    throw new Error(`Unknown collection ${id}`);
  }

  return def;
}

const IMAGE_KEYS = ["src", "width", "height"] as const;
const ICON_KEYS = ["name", "icon", "monogram"] as const;
const SECTION_KEYS = ["id", "visible"] as const;

function checksOf(fields: readonly FieldDef[], scope: Scope, draft: ContentDraft): Check[] {
  return fields.flatMap((field): Check[] => {
    const checks = field.optional
      ? fieldChecks(field, scope, draft).map((check) => ({ ...check, optional: true }))
      : fieldChecks(field, scope, draft);

    if (field.filledBy) {
      const filled = field.filledBy;
      const active = scope.factBases.map((base) => {
        const path = resolveFactPath(draft.content[filled.file], [...base, ...filled.path]);
        const value = path === undefined ? undefined : getAt(draft.content[filled.file], path);
        return Array.isArray(value) && value.length > 0;
      });

      return checks.map((check) => (check.instances.length === active.length ? { ...check, active } : check));
    }

    if (!field.showWhen) {
      return checks;
    }

    // A guarded field only has to exist on entries of its kind (a repo Lab entry, a
    // pattern cover). With no such entry right now, the field has nothing to point at.
    const guard = field.showWhen;
    const active = scope.factBases.map((base) => {
      const path = resolveFactPath(draft.content[guard.fact.file], [...base, ...guard.fact.path]);
      return path !== undefined && getAt(draft.content[guard.fact.file], path) === guard.equals;
    });

    return [
      factCheck(guard.fact, scope, "none", draft),
      // Nested list or collection checks have their own instances; only the field's own
      // checks line up one-to-one with the entries in scope.
      ...checks.map((check) =>
        field.kind !== "collection" && field.kind !== "copyList" && check.instances.length === active.length
          ? { ...check, active }
          : check,
      ),
    ];
  });
}

function fieldChecks(field: FieldDef, scope: Scope, draft: ContentDraft): Check[] {
  const own: Check[] = [];

  for (const extra of field.covers ?? []) {
    own.push(factCheck(extra, scope, "exact", draft));
  }

  switch (field.kind) {
    case "text":
    case "paragraph":
      return [...own, copyCheck(field.copy, scope, "exact")];
    case "textList":
      return [...own, copyCheck(field.copy, scope, "under")];
    case "fact":
    case "month":
    case "select":
    case "toggle":
      return [...own, factCheck(field.fact, scope, "exact", draft)];
    case "tags":
      return [...own, factCheck(field.fact, scope, "under", draft)];
    case "icon":
      return [...own, factCheck(field.fact, scope, ICON_KEYS, draft)];
    case "image":
      return [
        ...own,
        factCheck(field.fact, scope, IMAGE_KEYS, draft),
        ...(field.alt ? [copyCheck(field.alt, scope, "exact")] : []),
      ];
    case "resume":
      return [...own, factCheck(fact("site", "profile", "resumePath"), TOP, "exact", draft)];
    case "sections":
      return [...own, factCheck(fact("site", "sections"), TOP, SECTION_KEYS, draft)];
    case "copyList": {
      // The list claims nothing: its item fields claim the leaves they edit.
      const list = copyCheck(field.copy, scope, "none");
      // Items are looked up in English; checkDraft keeps the locales the same length.
      const itemBases = list.instances.flatMap((base) => {
        const items = getAt(draft.messages.en[list.space as MessageDomain], base);
        return Array.isArray(items) ? items.map((_, index): NodePath => [...base, index]) : [];
      });
      const itemScope: Scope = {
        copySpace: list.space as MessageDomain,
        copyBases: itemBases,
        copyTemplate: field.template,
        factBases: [],
      };

      return [...own, list, ...checksOf(field.item, itemScope, draft)];
    }
    case "collection": {
      const def = collectionDef(field.collection);
      const entries = getAt(draft.content[def.facts.file], def.facts.path);
      const list = Array.isArray(entries) ? (entries as Record<string, unknown>[]) : [];
      const entryScope: Scope = {
        copySpace: def.copy?.domain,
        copyBases: list.map((entry) => [...(def.copy?.path ?? []), String(entry[def.idKey])]),
        copyTemplate: def.copy?.item,
        factSpace: def.facts.file,
        factBases: list.map((_, index): NodePath => [...def.facts.path, index]),
      };
      // The id is the entry's key; the editor shows it read-only, so it counts as reached.
      const idCheck = factCheck(fact(def.facts.file, def.idKey), entryScope, "exact", draft);

      return [...own, idCheck, ...checksOf(field.fields, entryScope, draft)];
    }
  }
}

function allChecks(sections: readonly SectionDef[], draft: ContentDraft): Check[] {
  return sections.flatMap((section) => checksOf(section.fields, TOP, draft));
}

type Claims = { exact: Set<string>; under: string[] };

function claimsOf(sections: readonly SectionDef[], draft: ContentDraft, kind: Check["kind"]): Claims {
  const claims: Claims = { exact: new Set(), under: [] };

  for (const check of allChecks(sections, draft)) {
    if (check.kind !== kind || check.claim === "none") {
      continue;
    }

    const root =
      kind === "copy"
        ? draft.messages.en[check.space as MessageDomain]
        : draft.content[check.space as ContentFileName];

    for (const path of check.instances) {
      const text = `${check.space}.${pathText(path)}`;

      if (check.claim === "exact") {
        claims.exact.add(text);
      } else if (check.claim === "under") {
        claims.under.push(text);
      } else {
        const value = getAt(root, path);
        const objects = Array.isArray(value)
          ? value.map((_, index): NodePath => [...path, index])
          : [path];

        for (const object of objects) {
          for (const key of check.claim) {
            claims.exact.add(`${check.space}.${pathText([...object, key])}`);
          }
        }
      }
    }
  }

  return claims;
}

function isCovered(leaf: string, claims: Claims): boolean {
  return (
    claims.exact.has(leaf) ||
    claims.under.some((claim) => leaf.startsWith(`${claim}.`) || leaf.startsWith(`${claim}[`))
  );
}

// English leaves no field reaches, as "domain.path". The UI lists these under "Other".
export function uncoveredCopyPaths(sections: readonly SectionDef[], draft: ContentDraft): string[] {
  const claims = claimsOf(sections, draft, "copy");

  return DOMAINS.flatMap((domain) =>
    leafPaths(draft.messages.en[domain])
      .map((path) => `${domain}.${path}`)
      .filter((leaf) => !isCovered(leaf, claims)),
  );
}

function factLeaves(node: unknown, prefix = ""): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((entry, index) => factLeaves(entry, `${prefix}[${index}]`));
  }

  if (node !== null && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) =>
      factLeaves(value, prefix ? `${prefix}.${key}` : key),
    );
  }

  return [prefix];
}

// Fact leaves (including null values) no field reaches, as "file.path".
export function uncoveredFactPaths(sections: readonly SectionDef[], draft: ContentDraft): string[] {
  const claims = claimsOf(sections, draft, "fact");
  const files: ContentFileName[] = ["site", "portfolio", "projects"];

  return files.flatMap((file) =>
    factLeaves(draft.content[file])
      .map((path) => `${file}.${path}`)
      .filter((leaf) => !isCovered(leaf, claims)),
  );
}

// Field paths that resolve nowhere, so a renamed key cannot leave a dead field behind.
export function danglingFieldPaths(sections: readonly SectionDef[], draft: ContentDraft): string[] {
  const dangling = new Set<string>();

  for (const check of allChecks(sections, draft)) {
    const name = `${check.space}.${pathText(check.rel)}`;

    if (check.wrongSpace) {
      dangling.add(`wrong-space:${name}`);
      continue;
    }

    // A guarded field whose kind no entry has right now has nothing to look at.
    const instances = check.active ? check.instances.filter((_, index) => check.active![index]) : check.instances;

    if (check.active && instances.length === 0) {
      continue;
    }

    if (check.kind === "fact") {
      // A collection with no entries yet has nothing to look at; the schema is not at fault.
      // Neither is an optional key that no entry happens to set.
      const exists =
        instances.length === 0 ||
        check.optional === true ||
        instances.some((path) => getAt(draft.content[check.space as ContentFileName], path) !== undefined);

      if (!exists) {
        dangling.add(name);
      }

      continue;
    }

    for (const locale of LOCALES) {
      const root = draft.messages[locale][check.space as MessageDomain];
      const exists =
        instances.length > 0
          ? instances.some((path) => getAt(root, path) !== undefined)
          : check.template === undefined || getAt(check.template, check.rel as NodePath) !== undefined;

      if (!exists) {
        dangling.add(`${locale}:${name}`);
      }
    }
  }

  return Array.from(dangling);
}

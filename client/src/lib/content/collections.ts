import type { MessageDomain } from "@/i18n/messages";

import type { MessageNode } from "./catalog";
import type { ContentFileName } from "./schema";

export type CollectionId =
  | "experiences"
  | "selectedApps"
  | "archiveProjects"
  | "skillGroups"
  | "education"
  | "languages"
  | "services"
  | "testimonials"
  | "lab";

export type CollectionDef = {
  id: CollectionId;
  // Where the list of facts lives, and which key of each fact is its identifier.
  facts: { file: ContentFileName; path: readonly string[] };
  idKey: "id" | "slug";
  // Where the matching copy lives in the message catalogues (an object keyed by the
  // fact id) and the blank shape of one entry. `when` narrows which facts need copy.
  copy?: {
    domain: MessageDomain;
    path: readonly string[];
    item: MessageNode;
    when?: (fact: Record<string, unknown>) => boolean;
  };
  // The facts of a newly added entry. Empty values are the ones the editor must still
  // fill in (a date, a URL); everything with a safe default is already set.
  blank: (id: string, seed: { name: string }) => Record<string, unknown>;
};

export const COLLECTIONS: readonly CollectionDef[] = [
  {
    id: "experiences",
    blank: (id, seed) => ({ id, company: seed.name, location: "", workMode: "remote", startDate: "", endDate: null, stack: [] }),
    facts: { file: "portfolio", path: ["experiences"] },
    idKey: "id",
    copy: {
      domain: "portfolio",
      path: ["experiences"],
      item: { title: "", summary: "", highlights: [""] },
    },
  },
  {
    id: "selectedApps",
    blank: (id, seed) => ({
      slug: id,
      contextId: "production",
      name: seed.name,
      years: "",
      // Private is the safe default: a public app is the one that may show screenshots.
      privacy: "private",
      stack: [],
      cover: { kind: "pattern", variant: "signal" },
      screenshots: [],
    }),
    facts: { file: "projects", path: ["selected"] },
    idKey: "slug",
    copy: {
      domain: "projects",
      path: ["selected"],
      // No `screenshots` key: a new app has none, and an app that gains
      // screenshots gets its captions under that key (see the caption rule in validate.ts).
      item: {
        descriptor: "",
        contextLabel: "",
        role: "",
        outcome: "",
        highlights: [""],
        cover: { alt: "" },
        caseStudy: { overview: [""], features: [""], responsibilities: [""] },
      },
    },
  },
  {
    id: "archiveProjects",
    blank: (id, seed) => ({
      id,
      contextId: "commercial",
      name: seed.name,
      stack: [],
      // Rejected until an image is uploaded.
      cover: { src: "", width: 0, height: 0 },
    }),
    facts: { file: "projects", path: ["archive"] },
    idKey: "id",
    copy: {
      domain: "projects",
      path: ["archive"],
      item: { descriptor: "", contextLabel: "", coverAlt: "" },
    },
  },
  {
    id: "skillGroups",
    blank: (id, seed) => ({ id, skills: [] }),
    facts: { file: "portfolio", path: ["skillGroups"] },
    idKey: "id",
    copy: { domain: "portfolio", path: ["skillGroupTitles"], item: "" },
  },
  {
    id: "education",
    blank: (id, seed) => ({ id, institution: seed.name }),
    facts: { file: "portfolio", path: ["education"] },
    idKey: "id",
    copy: { domain: "portfolio", path: ["education"], item: { program: "", period: "", result: "" } },
  },
  {
    id: "languages",
    blank: (id, seed) => ({ id }),
    facts: { file: "portfolio", path: ["languages"] },
    idKey: "id",
    copy: { domain: "portfolio", path: ["languages"], item: { name: "", proficiency: "" } },
  },
  {
    id: "services",
    blank: (id, seed) => ({ id, tags: [] }),
    facts: { file: "portfolio", path: ["services"] },
    idKey: "id",
    copy: { domain: "portfolio", path: ["services"], item: { title: "", description: "" } },
  },
  {
    id: "testimonials",
    blank: (id, seed) => ({ id, name: seed.name, company: "" }),
    facts: { file: "portfolio", path: ["testimonials"] },
    idKey: "id",
    copy: { domain: "portfolio", path: ["testimonials"], item: { quote: "", role: "" } },
  },
  {
    id: "lab",
    blank: (id, seed) => ({ id, source: "repo", name: seed.name, url: "", stack: [] }),
    facts: { file: "portfolio", path: ["lab"] },
    idKey: "id",
    // An archive entry borrows its text from the archive project it points at.
    copy: {
      domain: "portfolio",
      path: ["lab"],
      item: { description: "" },
      when: (fact) => fact.source === "repo",
    },
  },
];

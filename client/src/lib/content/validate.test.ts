import { describe, expect, it } from "vitest";

import { checkCatalogParity, type MessageCatalogs, type MessageNode } from "./catalog";
import { COLLECTIONS, type CollectionId } from "./collections";
import type { ContentFileName, ContentFiles } from "./schema";
import { checkContentReferences, parseContentFiles } from "./validate";

const image = { src: "/images/x.png", width: 1920, height: 1200 };

function validContent(): ContentFiles {
  return {
    site: {
      profile: {
        name: "Marco Abel",
        nickname: "Abel",
        email: "abel@example.com",
        city: "Jakarta",
        country: "Indonesia",
        timezone: "Asia/Jakarta",
        resumePath: "/resume.pdf",
        portrait: image,
      },
      socialLinks: [
        { id: "email", href: "mailto:abel@example.com" },
        { id: "gitHub", href: "https://github.com/abel" },
      ],
      heroFacts: { experience: "5 years", shipped: "10 apps" },
      dailyStack: ["TypeScript"],
      sections: [
        { id: "apps", visible: true },
        { id: "about", visible: true },
      ],
    },
    portfolio: {
      experiences: [
        {
          id: "satellyte",
          company: "Satellyte",
          location: "Jakarta",
          workMode: "hybrid",
          startDate: "2024-01",
          endDate: null,
          stack: ["React"],
        },
        {
          id: "acme",
          company: "Acme",
          location: "Remote",
          workMode: "remote",
          startDate: "2022-01",
          endDate: "2023-12",
          stack: [],
        },
      ],
      skillGroups: [{ id: "frontend", skills: ["React"] }],
      skillIcons: [{ name: "React", icon: "react" }],
      education: [{ id: "uni", institution: "University" }],
      languages: [{ id: "english" }],
      services: [{ id: "web", tags: ["Next.js"] }],
      testimonials: [],
      lab: [{ id: "xiaopee-lab", source: "archive", archiveId: "xiaopee" }],
    },
    projects: {
      selected: [
        {
          slug: "satellyte",
          contextId: "production",
          name: "Satellyte",
          years: "2024",
          privacy: "public",
          liveUrl: "https://satellyte.example.com",
          stack: ["React"],
          cover: { kind: "image", ...image },
          screenshots: [image],
        },
        {
          slug: "palmgrade",
          contextId: "commercial",
          name: "Palmgrade",
          years: "2023",
          privacy: "private",
          stack: [],
          cover: { kind: "pattern", variant: "vision" },
          screenshots: [],
        },
      ],
      archive: [
        {
          id: "xiaopee",
          contextId: "commercial",
          name: "Xiaopee",
          stack: [],
          cover: image,
          repositoryUrl: "https://github.com/abel/xiaopee",
        },
        { id: "no-repo", contextId: "training", name: "No repo", stack: [], cover: image },
      ],
    },
  };
}

// Fixture entries follow each collection's real copy template, so the shape rule has
// something true to check.
function filled(node: MessageNode, text: string): MessageNode {
  if (typeof node === "string") {
    return text;
  }

  if (Array.isArray(node)) {
    return node.map((entry) => filled(entry, text));
  }

  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, filled(value, text)]));
}

function catalogFor(text: string) {
  const item = (id: CollectionId) =>
    filled(COLLECTIONS.find((collection) => collection.id === id)!.copy!.item, text);

  return {
    common: { greeting: text },
    portfolio: {
      experiences: { satellyte: item("experiences"), acme: item("experiences") },
      skillGroupTitles: { frontend: item("skillGroups") },
      education: { uni: item("education") },
      languages: { english: item("languages") },
      services: { web: item("services") },
      testimonials: {},
      lab: {},
    },
    projects: {
      selected: {
        satellyte: {
          ...(item("selectedApps") as object),
          screenshots: [{ caption: text }],
        },
        palmgrade: { ...(item("selectedApps") as object), screenshots: [] },
      },
      archive: { xiaopee: item("archiveProjects"), "no-repo": item("archiveProjects") },
    },
  };
}

function validCatalogs(): MessageCatalogs {
  return { en: catalogFor("English"), id: catalogFor("Indonesia") } as MessageCatalogs;
}

function raw(content: ContentFiles): Record<ContentFileName, unknown> {
  return content;
}

function change(edit: (content: ContentFiles) => void): ContentFiles {
  const content = validContent();
  edit(content);
  return content;
}

const withExperience = (patch: Partial<ContentFiles["portfolio"]["experiences"][number]>) =>
  change((c) => Object.assign(c.portfolio.experiences[0], patch));
const withDuplicateExperienceId = () =>
  change((c) => {
    c.portfolio.experiences[1].id = "satellyte";
  });
const withPrivateScreenshot = () =>
  change((c) => {
    c.projects.selected[1].screenshots = [image];
  });
const withPrivateLiveUrl = () =>
  change((c) => {
    c.projects.selected[1].liveUrl = "https://private.example.com";
  });
const withLabArchiveRef = (archiveId: string) =>
  change((c) => {
    c.portfolio.lab = [{ id: "xiaopee-lab", source: "archive", archiveId }];
  });
const withSections = (ids: ContentFiles["site"]["sections"][number]["id"][]) =>
  change((c) => {
    c.site.sections = ids.map((id) => ({ id, visible: true }));
  });
const withScreenshots = (count: number) =>
  change((c) => {
    c.projects.selected[0].screenshots = Array.from({ length: count }, () => image);
  });

type Loose = Record<string, Record<string, Record<string, unknown>>>;

function withoutIndonesianExperience(id: string): MessageCatalogs {
  const catalogs = validCatalogs();
  delete (catalogs.id.portfolio as unknown as Loose).experiences[id];
  return catalogs;
}

function withOrphanServiceCopy(id: string): MessageCatalogs {
  const catalogs = validCatalogs();
  (catalogs.en.portfolio as unknown as Loose).services[id] = { title: "x" };
  return catalogs;
}

function withCaptions(count: number): MessageCatalogs {
  const catalogs = validCatalogs();
  (catalogs.en.projects as unknown as Loose).selected.satellyte.screenshots = Array.from(
    { length: count },
    () => ({ caption: "c" }),
  );
  return catalogs;
}

function withPlaceholderMismatch(): MessageCatalogs {
  const catalogs = validCatalogs();
  (catalogs.en.common as unknown as Record<string, string>).greeting = "Hi {name}";
  return catalogs;
}

describe("content validation", () => {
  it("accepts the minimal valid fixture", () => {
    expect(parseContentFiles(raw(validContent())).ok).toBe(true);
    expect(checkContentReferences(validContent(), validCatalogs())).toEqual([]);
  });

  it("rejects a malformed month with the file and path", () => {
    const result = parseContentFiles(raw(withExperience({ startDate: "2026-3" })));

    expect(result).toMatchObject({
      ok: false,
      issues: [{ file: "portfolio", path: "experiences[0].startDate" }],
    });
  });

  it("rejects unknown keys and names the key", () => {
    const content = validContent();
    (content.site.profile as Record<string, unknown>).extra = 1;

    expect(parseContentFiles(raw(content))).toMatchObject({
      ok: false,
      issues: [{ file: "site", path: "profile.extra" }],
    });
  });

  it("rejects a social link with the wrong scheme", () => {
    const content = change((c) => {
      c.site.socialLinks[0].href = "https://abel@example.com";
    });

    expect(parseContentFiles(raw(content))).toMatchObject({
      ok: false,
      issues: [{ file: "site", path: "socialLinks[0].href" }],
    });
  });

  it.each([
    ["duplicate experience id", withDuplicateExperienceId(), "portfolio", "experiences[1].id"],
    [
      "end month before start",
      withExperience({ startDate: "2026-03", endDate: "2025-01" }),
      "portfolio",
      "experiences[0].endDate",
    ],
    ["private app with a live URL", withPrivateLiveUrl(), "projects", "selected[1].liveUrl"],
    [
      "lab entry pointing at a missing archive id",
      withLabArchiveRef("nope"),
      "portfolio",
      "lab[0].archiveId",
    ],
    [
      "lab entry pointing at an archive project without a repository",
      withLabArchiveRef("no-repo"),
      "portfolio",
      "lab[0].archiveId",
    ],
    ["section listed twice", withSections(["apps", "apps"]), "site", "sections[1].id"],
  ])("rejects %s", (_name, content, file, path) => {
    expect(checkContentReferences(content, validCatalogs())).toContainEqual(
      expect.objectContaining({ file, path }),
    );
  });

  it("accepts a private app with screenshots and their captions", () => {
    const content = withPrivateScreenshot();
    const catalogs = validCatalogs();
    (catalogs.en.projects as unknown as Loose).selected.palmgrade.screenshots = [{ caption: "x" }];
    (catalogs.id.projects as unknown as Loose).selected.palmgrade.screenshots = [{ caption: "x" }];

    expect(checkContentReferences(content, catalogs)).toEqual([]);
  });

  it("requires copy in both languages for every fact id and no orphaned copy", () => {
    expect(
      checkContentReferences(validContent(), withoutIndonesianExperience("satellyte")),
    ).toContainEqual(
      expect.objectContaining({ file: "messages", path: "id.portfolio.experiences.satellyte" }),
    );
    expect(checkContentReferences(validContent(), withOrphanServiceCopy("ghost"))).toContainEqual(
      expect.objectContaining({ file: "messages", path: "en.portfolio.services.ghost" }),
    );
  });

  it("requires one caption per screenshot", () => {
    expect(checkContentReferences(withScreenshots(2), withCaptions(1))).toContainEqual(
      expect.objectContaining({ path: "en.projects.selected.satellyte.screenshots" }),
    );
  });

  it("treats a missing screenshots array as zero captions", () => {
    const catalogs = validCatalogs();
    delete (catalogs.id.projects as unknown as Loose).selected.satellyte.screenshots;

    expect(checkContentReferences(validContent(), catalogs)).toContainEqual(
      expect.objectContaining({ path: "id.projects.selected.satellyte.screenshots" }),
    );
  });

  it("only requires lab copy for standalone repositories", () => {
    expect(checkContentReferences(withLabArchiveRef("xiaopee"), validCatalogs())).toEqual([]);
  });

  it("reports catalog parity problems", () => {
    expect(checkCatalogParity(withPlaceholderMismatch())).toContainEqual(
      expect.objectContaining({ file: "messages" }),
    );
    expect(checkCatalogParity(validCatalogs())).toEqual([]);
  });

  it("reports blank leaves and leaves missing from the other locale", () => {
    const blank = validCatalogs();
    (blank.id.common as unknown as Record<string, string>).greeting = " ";
    expect(checkCatalogParity(blank)).toContainEqual(
      expect.objectContaining({ path: "id.common.greeting", message: "Field is empty." }),
    );

    const missing = validCatalogs();
    (missing.en.common as unknown as Record<string, string>).extra = "More";
    expect(checkCatalogParity(missing)).toContainEqual(
      expect.objectContaining({ path: "id.common.extra" }),
    );
  });

  it("rejects duplicate social link ids and duplicate skill icon names", () => {
    const social = change((c) => {
      c.site.socialLinks = [
        { id: "gitHub", href: "https://github.com/a" },
        { id: "gitHub", href: "https://github.com/b" },
      ];
    });
    const icons = change((c) => {
      c.portfolio.skillIcons = [
        { name: "React", icon: "react" },
        { name: "React", icon: null },
      ];
    });

    expect(checkContentReferences(social, validCatalogs())).toContainEqual(
      expect.objectContaining({ file: "site", path: "socialLinks[1].id" }),
    );
    expect(checkContentReferences(icons, validCatalogs())).toContainEqual(
      expect.objectContaining({ file: "portfolio", path: "skillIcons[1].name" }),
    );
  });

  it("reports a public app with screenshots and no live URL instead of making it private", () => {
    const content = change((c) => {
      delete c.projects.selected[0].liveUrl;
    });

    expect(checkContentReferences(content, validCatalogs())).toContainEqual(
      expect.objectContaining({ file: "projects", path: "selected[0].liveUrl" }),
    );
  });

  it("accepts a public app with no screenshots and no live URL", () => {
    const content = change((c) => {
      delete c.projects.selected[0].liveUrl;
      c.projects.selected[0].screenshots = [];
    });
    const catalogs = validCatalogs();
    (catalogs.en.projects as unknown as Loose).selected.satellyte.screenshots = [];
    (catalogs.id.projects as unknown as Loose).selected.satellyte.screenshots = [];

    expect(checkContentReferences(content, catalogs)).toEqual([]);
  });
});

describe("copy entry shape", () => {
  const shaped = validCatalogs;

  function services(catalogs: MessageCatalogs, locale: "en" | "id" = "en") {
    return (catalogs[locale].portfolio as unknown as Loose).services;
  }

  it("accepts entries that follow the template, including arrays of other lengths", () => {
    const catalogs = shaped();
    const experiences = (catalogs.en.portfolio as unknown as Loose).experiences;
    experiences.satellyte = { title: "T", summary: "S", highlights: ["a", "b", "c"] };
    experiences.acme = { title: "T", summary: "S", highlights: [] };

    expect(checkContentReferences(validContent(), catalogs)).toEqual([]);
  });

  it.each([
    ["a missing key", { title: "T" }, "en.portfolio.services.web.description"],
    ["a string where an array belongs", { title: "T", description: ["x"] }, "en.portfolio.services.web.description"],
    ["a number", { title: 7, description: "D" }, "en.portfolio.services.web.title"],
    ["a whole entry of the wrong type", "just text", "en.portfolio.services.web"],
  ])("rejects %s", (_name, entry, path) => {
    const catalogs = shaped();
    services(catalogs).web = entry as never;

    expect(checkContentReferences(validContent(), catalogs)).toContainEqual(
      expect.objectContaining({ file: "messages", path }),
    );
  });

  it("checks nested objects and array members", () => {
    const catalogs = shaped();
    const selected = (catalogs.en.projects as unknown as Loose).selected;
    selected.palmgrade = {
      descriptor: "",
      contextLabel: "",
      role: "",
      outcome: "",
      highlights: [1],
      cover: {},
      caseStudy: { overview: [""], features: [""] },
    };

    const paths = checkContentReferences(validContent(), catalogs).map((issue) => issue.path);

    expect(paths).toContain("en.projects.selected.palmgrade.highlights[0]");
    expect(paths).toContain("en.projects.selected.palmgrade.cover.alt");
    expect(paths).toContain("en.projects.selected.palmgrade.caseStudy.responsibilities");
  });
});

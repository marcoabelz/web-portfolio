import { describe, expect, it } from "vitest";

import { COLLECTIONS } from "@/lib/content/collections";
import { getContentFiles } from "@/lib/content/load";

import { getMessages } from "./messages";

type MessageValue = string | readonly MessageValue[] | MessageObject;
type MessageObject = { readonly [key: string]: MessageValue };

function leafKeyPaths(value: MessageValue, prefix = ""): string[] {
  if (typeof value === "string") {
    return [prefix];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      leafKeyPaths(entry, `${prefix}[${index}]`),
    );
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    leafKeyPaths(entry, prefix ? `${prefix}.${key}` : key),
  );
}

// Copy of a collection is an object keyed by fact id, so it is legitimately empty
// while the collection has no entries (testimonials ships that way). Nothing else may be.
const COLLECTION_COPY_PATHS = new Set(
  COLLECTIONS.flatMap(({ copy }) => (copy ? [[copy.domain, ...copy.path].join(".")] : [])),
);

function expectPopulated(value: MessageValue, path = ""): void {
  if (typeof value === "string") {
    expect(value.trim(), path).not.toBe("");
    return;
  }

  if (Array.isArray(value)) {
    expect(value.length, path).toBeGreaterThan(0);
    value.forEach((entry, index) => expectPopulated(entry, `${path}[${index}]`));
    return;
  }

  if (!COLLECTION_COPY_PATHS.has(path)) {
    expect(Object.keys(value).length, path).toBeGreaterThan(0);
  }
  Object.entries(value).forEach(([key, entry]) =>
    expectPopulated(entry, path ? `${path}.${key}` : key),
  );
}

function stringLeaves(
  value: MessageValue,
  prefix = "",
): Record<string, string> {
  if (typeof value === "string") {
    return { [prefix]: value };
  }

  if (Array.isArray(value)) {
    return Object.assign(
      {},
      ...value.map((entry, index) =>
        stringLeaves(entry, `${prefix}[${index}]`),
      ),
    );
  }

  return Object.assign(
    {},
    ...Object.entries(value).map(([key, entry]) =>
      stringLeaves(entry, prefix ? `${prefix}.${key}` : key),
    ),
  );
}

function icuPlaceholders(message: string): string[] {
  return Array.from(
    message.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\s*(?:,|\})/g),
    (match) => match[1],
  ).sort();
}

describe("localized message catalogs", () => {
  const english = getMessages("en");
  const indonesian = getMessages("id");

  it.each(["common", "portfolio", "projects"] as const)(
    "keeps Indonesian %s leaf keys structurally identical to English",
    (domain) => {
      expect(leafKeyPaths(indonesian[domain]).sort()).toEqual(
        leafKeyPaths(english[domain]).sort(),
      );
    },
  );

  it("keeps a copy entry for every selected and archive fact in each locale", () => {
    const { projects } = getContentFiles();
    for (const messages of [english, indonesian]) {
      expect(Object.keys(messages.projects.selected).sort()).toEqual(projects.selected.map((app) => app.slug).sort());
      expect(Object.keys(messages.projects.archive).sort()).toEqual(projects.archive.map((app) => app.id).sort());
    }
  });

  it.each(["common", "portfolio", "projects"] as const)(
    "keeps Indonesian %s ICU placeholders identical to English",
    (domain) => {
      const englishLeaves = stringLeaves(english[domain]);
      const indonesianLeaves = stringLeaves(indonesian[domain]);

      Object.entries(englishLeaves).forEach(([path, message]) => {
        expect(icuPlaceholders(indonesianLeaves[path])).toEqual(
          icuPlaceholders(message),
        );
      });
    },
  );

  it("keeps locale-invariant portfolio facts out of message catalogs", () => {
    [english, indonesian].forEach(({ common, portfolio, projects }) => {
      expect(portfolio.profile).not.toHaveProperty("name");
      expect(portfolio.profile).not.toHaveProperty("location");
      expect(portfolio.profile).not.toHaveProperty("email");
      expect(portfolio.profile).not.toHaveProperty("resumePath");
      expect(common.footer).not.toHaveProperty("links");
      expect(common.labels).not.toHaveProperty("email");
      expect(common.labels).not.toHaveProperty("linkedIn");
      expect(common.labels).not.toHaveProperty("gitHub");
      expect(common.labels).not.toHaveProperty("whatsApp");
      expect(Object.values(stringLeaves(common))).not.toContainEqual(
        expect.stringContaining(getContentFiles().site.profile.name),
      );

      Object.values(portfolio.experiences).forEach((experience) => {
        expect(experience).not.toHaveProperty("company");
        expect(experience).not.toHaveProperty("location");
        expect(experience).not.toHaveProperty("startDate");
        expect(experience).not.toHaveProperty("endDate");
        expect(experience).not.toHaveProperty("stack");
      });

      Object.values(portfolio.education).forEach((education) => {
        expect(education).not.toHaveProperty("institution");
      });

      Object.values(projects.selected).forEach((project) => {
        expect(project).toHaveProperty("contextLabel");
        expect(project).not.toHaveProperty("context");
        expect(project).not.toHaveProperty("slug");
        expect(project).not.toHaveProperty("name");
        expect(project).not.toHaveProperty("privacy");
        expect(project).not.toHaveProperty("liveUrl");
        expect(project).not.toHaveProperty("stack");
        expect(project.cover).not.toHaveProperty("kind");
        expect(project.cover).not.toHaveProperty("variant");
        expect(project.cover).not.toHaveProperty("src");
      });

      Object.values(projects.archive).forEach((project) => {
        expect(project).toHaveProperty("contextLabel");
        expect(project).not.toHaveProperty("context");
        expect(project).not.toHaveProperty("name");
        expect(project).not.toHaveProperty("repositoryUrl");
        expect(project).not.toHaveProperty("stack");
      });
    });
  });

  it.each([
    ["English", english],
    ["Indonesian", indonesian],
  ] as const)("contains no blank strings or empty arrays in %s", (_name, messages) => {
    expectPopulated(messages);
  });
});

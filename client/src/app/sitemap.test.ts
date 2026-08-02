import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getSelectedProjectSlugs } from "@/data/projects";
import { languageAlternates, localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

function absolute(path: string): string {
  return new URL(path, SITE.url).href;
}

describe("sitemap", () => {
  it("contains all 14 localized documents with absolute language alternates", () => {
    const logicalPaths = [
      "/",
      ...getSelectedProjectSlugs().map((slug) => `/work/${slug}`),
      "/work/archive",
    ];
    const expectedUrls = logicalPaths.flatMap((path) =>
      routing.locales.map((locale) => absolute(localizePath(path, locale))),
    );
    const entries = sitemap();

    expect(entries).toHaveLength(14);
    expect(entries.map(({ url }) => url)).toEqual(expectedUrls);

    for (const path of logicalPaths) {
      const alternates = languageAlternates(path);
      const expectedLanguages = {
        en: absolute(alternates.en),
        id: absolute(alternates.id),
      };

      for (const locale of routing.locales) {
        const url = absolute(localizePath(path, locale));
        expect(entries.find((entry) => entry.url === url)?.alternates?.languages).toEqual(
          expectedLanguages,
        );
      }
    }
  });
});

describe("robots", () => {
  it("publishes one root sitemap URL", () => {
    expect(robots().sitemap).toBe(absolute("/sitemap.xml"));
  });
});

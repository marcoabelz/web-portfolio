import type { MetadataRoute } from "next";

import { getSelectedProjectSlugs } from "@/data/projects";
import { languageAlternates, localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", changeFrequency: "monthly", priority: 1 },
    ...getSelectedProjectSlugs().map((slug) => ({
      path: `/work/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { path: "/work/archive", changeFrequency: "yearly", priority: 0.5 },
  ] as const;

  return pages.flatMap(({ path, changeFrequency, priority }) => {
    const alternatePaths = languageAlternates(path);
    const languages = {
      en: new URL(alternatePaths.en, SITE.url).href,
      id: new URL(alternatePaths.id, SITE.url).href,
    };

    return routing.locales.map((locale) => ({
      url: new URL(localizePath(path, locale), SITE.url).href,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}

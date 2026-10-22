import "server-only";

import * as icons from "simple-icons";

import type { SkillIcon } from "@/lib/content/schema";
import type { TechTag } from "@/lib/content/models";

import { defaultMonogram } from "./monogram";

type BrandIcon = { slug: string; title: string; path: string };

// Built once per server process. Importing simple-icons only here keeps the
// ~3k icon paths out of client bundles: components receive resolved tags.
const BRAND_ICONS: ReadonlyMap<string, BrandIcon> = new Map(
  (Object.values(icons) as BrandIcon[])
    .filter((icon) => typeof icon === "object" && icon !== null && "slug" in icon)
    .map((icon) => [icon.slug, { slug: icon.slug, title: icon.title, path: icon.path }]),
);

export function brandIcon(slug: string): BrandIcon | null {
  return BRAND_ICONS.get(slug) ?? null;
}

// One <symbol> per distinct brand slug that resolves; unknown slugs are skipped, matching
// resolveTechTag's monogram fallback. Slugs are simple-icons identifiers ([a-z0-9]).
export function buildIconSprite(slugs: Iterable<string>): string {
  const symbols = Array.from(new Set(slugs))
    .sort()
    .flatMap((slug) => {
      const icon = BRAND_ICONS.get(slug);
      return icon ? [`<symbol id="si-${icon.slug}" viewBox="0 0 24 24"><path d="${icon.path}"/></symbol>`] : [];
    });
  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`;
}

export { defaultMonogram };

export function resolveTechTag(name: string, skillIcons: readonly SkillIcon[]): TechTag {
  const entry = skillIcons.find((item) => item.name === name);
  if (entry?.monogram) return { name, icon: { kind: "monogram", text: entry.monogram } };
  const brand = entry?.icon ? brandIcon(entry.icon) : null;
  if (brand) return { name, icon: { kind: "brand", slug: brand.slug, title: brand.title } };
  return { name, icon: { kind: "monogram", text: defaultMonogram(name) } };
}

function rank(icon: BrandIcon, q: string): number {
  const title = icon.title.toLowerCase();
  if (title === q || icon.slug === q) return 0;
  // "next" should find "Next.js" (a whole first word) before "Nextra".
  if (title.startsWith(q) && !/[a-z0-9]/.test(title.charAt(q.length))) return 1;
  if (title.startsWith(q)) return 2;
  if (icon.slug.startsWith(q)) return 3;
  if (title.includes(q) || icon.slug.includes(q)) return 4;
  return -1;
}

export function searchBrandIcons(query: string, limit = 20): BrandIcon[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Array.from(BRAND_ICONS.values())
    .map((icon) => ({ icon, score: rank(icon, q) }))
    .filter((hit) => hit.score >= 0)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.icon.title.length - b.icon.title.length ||
        a.icon.slug.localeCompare(b.icon.slug),
    )
    .slice(0, limit)
    .map((hit) => hit.icon);
}

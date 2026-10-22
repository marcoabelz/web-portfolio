import type { HomeSectionId, NavigationItem } from "@/types/portfolio";

export const NAV_SECTION_IDS = ["apps", "about", "services", "experience", "contact"] as const;

type NavSectionId = (typeof NAV_SECTION_IDS)[number];

export type ResolvedSection = { id: HomeSectionId; number: string };

// Hidden and empty sections are dropped before numbering, so the numbers a reader
// sees never skip ("01, 02, 04").
export function resolveHomeSections(
  config: readonly { id: HomeSectionId; visible: boolean }[],
  isEmpty: (id: HomeSectionId) => boolean,
): ResolvedSection[] {
  return config
    .filter(({ id, visible }) => visible && !isEmpty(id))
    .map(({ id }, index) => ({ id, number: String(index + 1).padStart(2, "0") }));
}

const isNavSectionId = (id: HomeSectionId): id is NavSectionId =>
  (NAV_SECTION_IDS as readonly string[]).includes(id);

export function navigationFor(
  sections: readonly ResolvedSection[],
  labels: Record<NavSectionId, string>,
): NavigationItem[] {
  return sections.flatMap(({ id }) =>
    isNavSectionId(id) ? [{ label: labels[id], href: `/#${id}` as const }] : [],
  );
}

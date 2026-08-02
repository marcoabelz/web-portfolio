import { getPortfolioContent } from "@/data/portfolio";
import type { Locale } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";
import { SITE } from "@/lib/site";

export function buildPersonStructuredData(locale: Locale) {
  const portfolio = getPortfolioContent(locale);
  const professionalProfiles = portfolio.socialLinks
    .filter(({ id }) => id === "linkedIn" || id === "gitHub")
    .map(({ href }) => href);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: portfolio.profile.name,
    url: SITE.url,
    jobTitle: portfolio.profile.title,
    description: getMessages(locale).common.labels.siteMetadataDescription,
    sameAs: professionalProfiles,
    knowsAbout: Array.from(
      new Set(portfolio.skillGroups.flatMap(({ skills }) => skills)),
    ),
    alumniOf: portfolio.education.map(({ institution }) => ({
      "@type": "EducationalOrganization",
      name: institution,
    })),
  } as const;
}

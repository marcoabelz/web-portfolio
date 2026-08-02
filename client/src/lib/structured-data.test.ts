import { describe, expect, it } from "vitest";

import { getPortfolioContent } from "@/data/portfolio";
import { getMessages } from "@/i18n/messages";
import { SITE } from "@/lib/site";
import { buildPersonStructuredData } from "@/lib/structured-data";

describe("buildPersonStructuredData", () => {
  it.each(["en", "id"] as const)("builds localized %s Person JSON-LD", (locale) => {
    const portfolio = getPortfolioContent(locale);
    const person = buildPersonStructuredData(locale);

    expect(person).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: portfolio.profile.name,
      url: SITE.url,
      jobTitle: portfolio.profile.title,
      description: getMessages(locale).common.labels.siteMetadataDescription,
      sameAs: [
        "https://www.linkedin.com/in/marco-abel-zefanya/",
        "https://github.com/marcoabelz",
      ],
      alumniOf: [
        { "@type": "EducationalOrganization", name: "Hacktiv8" },
        { "@type": "EducationalOrganization", name: "Universitas Gunadarma" },
      ],
    });
    expect(person.knowsAbout).toContain("TypeScript");
    expect(person.knowsAbout).toContain("PostgreSQL");
  });

  it("selects professional profile URLs represented by stable social-link ids", () => {
    const portfolio = getPortfolioContent("en");
    const expectedProfiles = portfolio.socialLinks
      .filter(({ id }) => id === "linkedIn" || id === "gitHub")
      .map(({ href }) => href);

    expect(buildPersonStructuredData("en").sameAs).toEqual(expectedProfiles);
  });

  it("localizes narrative fields while preserving invariant Person facts", () => {
    const english = buildPersonStructuredData("en");
    const indonesian = buildPersonStructuredData("id");

    expect(indonesian.description).not.toBe(english.description);
    expect({
      name: indonesian.name,
      url: indonesian.url,
      sameAs: indonesian.sameAs,
      knowsAbout: indonesian.knowsAbout,
      alumniOf: indonesian.alumniOf,
    }).toEqual({
      name: english.name,
      url: english.url,
      sameAs: english.sameAs,
      knowsAbout: english.knowsAbout,
      alumniOf: english.alumniOf,
    });
  });
});

import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/locale";
import { getContentFiles } from "@/lib/content/load";
import { formatMonth } from "@/lib/format-month";
import type {
  Education,
  Experience,
  Language,
  SkillGroup,
  SocialLink,
  YearMonth,
} from "@/types/portfolio";

export const SOCIAL_LINK_LABELS = {
  email: "Email",
  linkedIn: "LinkedIn",
  gitHub: "GitHub",
  whatsApp: "WhatsApp",
} as const;

type ProfileFacts = {
  readonly name: string;
  readonly nickname: string;
  readonly location: string;
  readonly email: string;
  readonly resumePath: string;
};

export type PortfolioContent = {
  readonly profile: ProfileFacts & {
    readonly title: string;
    readonly specialty: string;
    readonly intro: { readonly lead: string; readonly tail: string };
    readonly availability: string;
  };
  readonly socialLinks: readonly SocialLink[];
  readonly aboutParagraphs: readonly string[];
  readonly experiences: readonly Experience[];
  readonly skillGroups: readonly SkillGroup[];
  readonly education: readonly Education[];
  readonly languages: readonly Language[];
};

export function getPortfolioContent(locale: Locale): PortfolioContent {
  const messages = getMessages(locale);
  const copy = messages.portfolio;
  const { site, portfolio } = getContentFiles();
  // Validation guarantees every fact has its copy, so the lookups below cannot miss.
  const experienceCopy = copy.experiences as Record<string, (typeof copy.experiences)["satellyte"]>;
  const skillGroupTitles = copy.skillGroupTitles as Record<string, string>;
  const educationCopy = copy.education as Record<string, (typeof copy.education)["hacktiv8"]>;
  const languageCopy = copy.languages as Record<string, Language>;

  const profileFacts: ProfileFacts = {
    name: site.profile.name,
    nickname: site.profile.nickname,
    location: `${site.profile.city}, ${site.profile.country}`,
    email: site.profile.email,
    resumePath: site.profile.resumePath,
  };
  const profile = { ...profileFacts, ...copy.profile };
  const socialLinks = site.socialLinks.map(({ id, href }) => ({
    id,
    label: SOCIAL_LINK_LABELS[id],
    href,
    external: id !== "email",
  })) as SocialLink[];
  const experiences = portfolio.experiences.map((fact) => {
    const localized = experienceCopy[fact.id];
    return {
      id: fact.id,
      company: fact.company,
      location: fact.location,
      startDate: fact.startDate as YearMonth,
      endDate: fact.endDate as YearMonth | null,
      start: formatMonth(fact.startDate as YearMonth, locale),
      end: fact.endDate
        ? formatMonth(fact.endDate as YearMonth, locale)
        : messages.common.sections.experience.present,
      title: localized.title,
      summary: localized.summary,
      highlights: [...localized.highlights],
      stack: [...fact.stack],
    };
  });
  const skillGroups = portfolio.skillGroups.map((fact) => ({
    title: skillGroupTitles[fact.id],
    skills: [...fact.skills],
  }));
  const education = portfolio.education.map((fact) => ({
    institution: fact.institution,
    ...educationCopy[fact.id],
  }));
  const languages = portfolio.languages.map(({ id }) => ({ ...languageCopy[id] }));

  return {
    profile,
    socialLinks,
    aboutParagraphs: [...copy.aboutParagraphs],
    experiences,
    skillGroups,
    education,
    languages,
  };
}

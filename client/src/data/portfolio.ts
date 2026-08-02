import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/locale";
import type {
  Education,
  Experience,
  ExperienceId,
  HomeSectionId,
  Language,
  NavigationItem,
  SkillGroup,
  SocialLink,
  YearMonth,
} from "@/types/portfolio";

export const HOME_SECTION_IDS = [
  "work",
  "experience",
  "skills",
  "contact",
] as const satisfies readonly HomeSectionId[];

const PROFILE_FACTS = {
  name: "Marco Abel Zefanya",
  nickname: "Abel",
  location: "Jakarta, Indonesia",
  email: "marcoabel25@gmail.com",
  resumePath: "/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf",
} as const;

const NAVIGATION_FACTS = [
  { id: "work", href: "/#work" },
  { id: "experience", href: "/#experience" },
  { id: "skills", href: "/#skills" },
  { id: "contact", href: "/#contact" },
] as const;

const SOCIAL_LINK_FACTS = [
  { id: "email", label: "Email", href: `mailto:${PROFILE_FACTS.email}`, external: false },
  {
    id: "linkedIn",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/marco-abel-zefanya/",
    external: true,
  },
  { id: "gitHub", label: "GitHub", href: "https://github.com/marcoabelz", external: true },
  { id: "whatsApp", label: "WhatsApp", href: "https://wa.me/6281294150023", external: true },
] as const satisfies readonly SocialLink[];

type ExperienceFact = {
  readonly id: ExperienceId;
  readonly company: string;
  readonly location: string;
  readonly startDate: YearMonth;
  readonly endDate: YearMonth | null;
  readonly stack: readonly string[];
};

const EXPERIENCE_FACTS = [
  {
    id: "satellyte",
    company: "Satellyte",
    location: "Jakarta, Indonesia",
    startDate: "2026-03",
    endDate: null,
    stack: ["Next.js", "React", "TypeScript", "Fastify", "Node.js", "BullMQ", "PostgreSQL", "Redis", "Python", "FastAPI", "Playwright", "Browserbase", "LLM APIs", "Stripe", "Docker", "GitHub Actions", "GHCR"],
  },
  {
    id: "nexio",
    company: "PT Nexio Teknologi",
    location: "Karawang, Indonesia",
    startDate: "2025-09",
    endDate: "2026-03",
    stack: ["Next.js", "React", "TypeScript", "Express.js", "Python", "FastAPI", "YOLO", "OpenCV", "TensorRT", "PostgreSQL", "MongoDB", "Redis", "Stripe", "MQTT", "Node-RED", "TimescaleDB", "Grafana", "Docker", "GitHub Actions"],
  },
  {
    id: "delta",
    company: "PT Delta Anugrah",
    location: "Jakarta, Indonesia",
    startDate: "2024-08",
    endDate: "2025-08",
    stack: ["TypeScript", "Next.js", "React", "Node.js", "Express.js", "PostgreSQL", "MongoDB", "REST APIs"],
  },
  {
    id: "sys",
    company: "PT SYS Indonesia",
    location: "Jakarta, Indonesia",
    startDate: "2021-09",
    endDate: "2023-11",
    stack: ["C", "winAMS", "White-box Testing", "Unit Testing", "Microsoft Excel"],
  },
] as const satisfies readonly ExperienceFact[];

const SKILL_GROUP_FACTS = [
  { id: "programmingLanguages", skills: ["TypeScript", "JavaScript", "Python", "SQL", "C"] },
  { id: "frontend", skills: ["React", "Next.js", "React Native", "Tailwind CSS"] },
  { id: "backendApis", skills: ["Node.js", "Fastify", "Express.js", "FastAPI", "REST APIs", "GraphQL", "BullMQ"] },
  { id: "databases", skills: ["PostgreSQL", "MongoDB", "Redis", "TimescaleDB"] },
  { id: "aiAutomation", skills: ["Playwright", "YOLO", "OpenCV", "TensorRT"] },
  { id: "infrastructure", skills: ["Docker", "GitHub Actions", "GHCR", "DigitalOcean", "Cloudflare"] },
  { id: "industrialIot", skills: ["MQTT", "Node-RED", "Grafana", "Raspberry Pi"] },
] as const;

const EDUCATION_FACTS = [
  { id: "hacktiv8", institution: "Hacktiv8" },
  { id: "gunadarma", institution: "Universitas Gunadarma" },
] as const;

const LANGUAGE_IDS = ["indonesian", "english"] as const;

export type PortfolioContent = {
  readonly profile: typeof PROFILE_FACTS & {
    readonly title: string;
    readonly specialty: string;
    readonly introduction: string;
    readonly availability: string;
  };
  readonly aboutFacts: readonly string[];
  readonly navigation: readonly NavigationItem[];
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

  const profile = { ...PROFILE_FACTS, ...copy.profile };
  const navigation = NAVIGATION_FACTS.map(({ id, href }) => ({
    label: messages.common.navigation[id],
    href,
  }));
  const socialLinks: readonly SocialLink[] = SOCIAL_LINK_FACTS.map((fact) => ({ ...fact }));
  const experiences = EXPERIENCE_FACTS.map((fact) => {
    const localized = copy.experiences[fact.id];
    return {
      ...fact,
      start: localized.displayStart,
      end: localized.displayEnd,
      title: localized.title,
      summary: localized.summary,
      highlights: [...localized.highlights],
      stack: [...fact.stack],
    };
  });
  const skillGroups = SKILL_GROUP_FACTS.map((fact) => ({
    title: copy.skillGroupTitles[fact.id],
    skills: [...fact.skills],
  }));
  const education = EDUCATION_FACTS.map((fact) => ({
    institution: fact.institution,
    ...copy.education[fact.id],
  }));
  const languages = LANGUAGE_IDS.map((id) => ({ ...copy.languages[id] }));

  return {
    profile,
    aboutFacts: [...copy.aboutFacts, PROFILE_FACTS.location],
    navigation,
    socialLinks,
    aboutParagraphs: [...copy.aboutParagraphs],
    experiences,
    skillGroups,
    education,
    languages,
  };
}

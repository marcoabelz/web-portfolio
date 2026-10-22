import type { HomeSectionId } from "@/lib/content/schema";

export type { HomeSectionId };

export type NavigationItem = {
  label: string;
  href: `/#${HomeSectionId}`;
};

export type SocialLinkId = "email" | "linkedIn" | "gitHub" | "whatsApp";
export type SocialLinkLabel = "Email" | "LinkedIn" | "GitHub" | "WhatsApp";

export type SocialLink =
  | { id: "email"; label: "Email"; href: `mailto:${string}`; external: false }
  | { id: "linkedIn"; label: "LinkedIn"; href: `https://${string}`; external: true }
  | { id: "gitHub"; label: "GitHub"; href: `https://${string}`; external: true }
  | { id: "whatsApp"; label: "WhatsApp"; href: `https://${string}`; external: true };

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Month = "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12";

export type YearMonth = `${"19" | "20" | "21"}${Digit}${Digit}-${Month}`;

export type ExperienceId = string;

export type SelectedProjectSlug = string;

export type ArchiveProjectId = string;

export type ProjectContextId = "production" | "commercial" | "internal" | "training";

export type Experience = {
  readonly id: ExperienceId;
  company: string;
  title: string;
  location: string;
  start: string;
  end: string;
  startDate: YearMonth;
  endDate: YearMonth | null;
  summary: string;
  highlights: readonly string[];
  stack: readonly string[];
};

export type Education = {
  institution: string;
  program: string;
  period: string;
  result: string;
};

export type Language = {
  name: string;
  proficiency: string;
  evidence?: string;
};

export type SkillGroup = {
  title: string;
  skills: readonly string[];
};

export type AbstractCoverVariant = "signal" | "vision" | "talent" | "telemetry";

export type ProjectCover =
  | { readonly kind: "abstract"; readonly variant: AbstractCoverVariant; readonly alt: string }
  | {
      readonly kind: "image";
      readonly src: string;
      readonly width: number;
      readonly height: number;
      readonly alt: string;
    };

export type CaseStudyContent = {
  readonly overview: readonly string[];
  readonly features: readonly string[];
  readonly responsibilities: readonly string[];
};

export type ProjectScreenshot = {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
};

type ProjectAccess =
  | { readonly privacy: "public"; readonly liveUrl?: `https://${string}` }
  | { readonly privacy: "private"; readonly liveUrl?: never };

export type SelectedProject = {
  readonly slug: SelectedProjectSlug;
  readonly name: string;
  readonly descriptor: string;
  readonly contextId: Exclude<ProjectContextId, "training">;
  readonly contextLabel: string;
  readonly role: string;
  readonly outcome: string;
  readonly highlights: readonly string[];
  readonly stack: readonly string[];
  readonly cover: ProjectCover;
  readonly screenshots: readonly ProjectScreenshot[];
  readonly caseStudy: CaseStudyContent;
} & ProjectAccess;

export type ArchiveProject = {
  readonly id: ArchiveProjectId;
  readonly name: string;
  readonly descriptor: string;
  readonly contextId: Extract<ProjectContextId, "commercial" | "training">;
  readonly contextLabel: string;
  readonly stack: readonly string[];
  readonly cover: { readonly src: string; readonly alt: string };
  readonly repositoryUrl?: `https://github.com/${string}`;
};

import { navigationFor, resolveHomeSections } from "@/components/sections/registry";
import type { ResolvedSection } from "@/components/sections/registry";
import { localizePath, type Locale } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";
import { getContentFiles } from "@/lib/content/load";
import type { ImageModel, TechTag } from "@/lib/content/models";
import { formatPeriod } from "@/lib/format-month";
import { resolveTechTag } from "@/lib/icons";
import { SOCIAL_LINK_LABELS } from "@/data/portfolio";
import { getArchiveProjects, getSelectedProjects } from "@/data/projects";
import type { SelectedProjectSlug, YearMonth } from "@/types/portfolio";
import type { HomeSectionId, NavigationItem, SocialLink } from "@/types/portfolio";

export type HeroModel = {
  name: string;
  nickname: string;
  intro: { lead: string; tail: string };
  actions: {
    apps: { label: string; href: string };
    project: { label: string; href: string };
    resume: { label: string; href: string };
  };
};

export type BentoModel = {
  portrait: ImageModel;
  caption: { name: string; title: string; specialty: string };
  facts: { label: string; value: string; caption: string }[];
  dailyStack: { label: string; tags: TechTag[] };
};

export type ProjectCoverModel = {
  variant: "signal" | "vision" | "talent" | "telemetry";
  alt: string;
};

export type AppCardModel = {
  slug: string;
  name: string;
  contextLabel: string;
  years: string;
  outcome: string;
  href: string;
} & (
  | { kind: "featured"; screenshot: ImageModel; liveUrl: string; stack: TechTag[] }
  | { kind: "private"; cover: ProjectCoverModel; screenshot?: ImageModel; confidential: boolean }
);

export type AppsModel = {
  title: string;
  description: string;
  privateNote: string;
  earlierLabel: string;
  earlierHref: string;
  labels: {
    live: string;
    viewCaseStudy: string;
    privateSystem: string;
    technologyStack: string;
    openLive: string;
    newTab: string;
  };
  cards: AppCardModel[];
};

export type AboutCardModel = { label: string; title: string; detail: string };

export type AboutModel = {
  title: string;
  lead: string;
  paragraphs: string[];
  cards: AboutCardModel[];
};

export type ServicesModel = {
  title: string;
  description: string;
  processLabel: string;
  /** ICU-style "Step {number}"; the component fills in the zero-padded number. */
  stepLabel: string;
  items: { id: string; title: string; description: string; tags: string[] }[];
  steps: { title: string; description: string }[];
};

export type ExperienceRowModel = {
  id: string;
  company: string;
  role: string;
  period: string;
  /** City and work arrangement, e.g. "Jakarta · Remote". */
  place: string;
  summary: string;
  highlights: string[];
  stack: TechTag[];
  stackLabel: string;
};

export type ExperienceModel = {
  title: string;
  description: string;
  rows: ExperienceRowModel[];
  labels: { show: string; hide: string; highlights: string; stack: string };
};

export type StackModel = {
  title: string;
  description: string;
  groups: { id: string; title: string; tags: TechTag[]; wide: boolean }[];
};

export type TestimonialsModel = {
  title: string;
  items: { id: string; quote: string; name: string; role: string; company: string }[];
};

export type LabModel = {
  title: string;
  description: string;
  newTabLabel: string;
  items: { id: string; name: string; description: string; url: string; stack: TechTag[] }[];
};

export type ContactAction = { label: string; href: string; external: boolean };

export type ContactModel = {
  label: string;
  titleLead: string;
  titleAccent: string;
  availability: string;
  newTabLabel: string;
  paths: {
    kind: "hiring" | "freelance";
    label: string;
    title: string;
    description: string;
    actions: ContactAction[];
  }[];
  email: string;
  socials: { id: SocialLink["id"]; label: string; href: string }[];
};

export type SectionModels = {
  hero: HeroModel;
  bento: BentoModel;
  apps: AppsModel;
  about: AboutModel;
  services: ServicesModel;
  experience: ExperienceModel;
  stack: StackModel;
  testimonials: TestimonialsModel;
  lab: LabModel;
  contact: ContactModel;
};

export type HomeModel = { sections: ResolvedSection[] } & SectionModels;

// A section with no entries hides itself; about and contact never count as empty.
function isEmpty(id: HomeSectionId): boolean {
  const { portfolio, projects } = getContentFiles();

  switch (id) {
    case "apps":
      return projects.selected.length === 0;
    case "services":
      return portfolio.services.length === 0;
    case "experience":
      return portfolio.experiences.length === 0;
    case "stack":
      return portfolio.skillGroups.length === 0;
    case "testimonials":
      return portfolio.testimonials.length === 0;
    case "lab":
      return portfolio.lab.length === 0;
    case "about":
    case "contact":
      return false;
  }
}

export function getHomeSections(): ResolvedSection[] {
  return resolveHomeSections(getContentFiles().site.sections, isEmpty);
}

export function getNavigation(locale: Locale): NavigationItem[] {
  const { navigation } = getMessages(locale).common;

  return navigationFor(getHomeSections(), navigation);
}

function buildHero(locale: Locale): HeroModel {
  const { site } = getContentFiles();
  const { common, portfolio } = getMessages(locale);
  const { actions } = common;

  return {
    name: site.profile.name,
    nickname: site.profile.nickname,
    intro: { lead: portfolio.profile.intro.lead, tail: portfolio.profile.intro.tail },
    actions: {
      apps: { label: actions.viewApps, href: localizePath("/#apps", locale) },
      project: { label: actions.startProject, href: localizePath("/#contact", locale) },
      resume: { label: actions.downloadResume, href: site.profile.resumePath },
    },
  };
}

function buildBento(locale: Locale): BentoModel {
  const { site, portfolio: facts } = getContentFiles();
  const { common, portfolio } = getMessages(locale);
  const { profile, heroFacts } = site;
  const copy = common.sections.facts;

  return {
    portrait: { ...profile.portrait, alt: profile.name },
    caption: {
      name: profile.name,
      title: portfolio.profile.title,
      specialty: portfolio.profile.specialty,
    },
    facts: [
      { label: copy.experienceLabel, value: heroFacts.experience, caption: copy.experienceCaption },
      { label: copy.shippedLabel, value: heroFacts.shipped, caption: copy.shippedCaption },
      {
        label: copy.basedInLabel,
        value: profile.city,
        caption: `${profile.country} (${profile.timezone})`,
      },
    ],
    dailyStack: {
      label: copy.dailyStack,
      tags: site.dailyStack.map((name) => resolveTechTag(name, facts.skillIcons)),
    },
  };
}

// Only a public app with both a screenshot and a live url is featured. Anything else
// is a plain card: a private app with screenshots (dummy data only) shows its card
// image, otherwise the sanitized cover.
export function isFeatured(fact: {
  privacy: string;
  liveUrl?: string;
  screenshots: readonly unknown[];
}): boolean {
  return fact.privacy === "public" && Boolean(fact.liveUrl) && fact.screenshots.length > 0;
}

// The one featured card: the first app in content order that qualifies. A second public
// app with screenshots and a live url (Pawlo, say) stays a plain card, so the homepage
// keeps a single wide hero card whatever /admin publishes. Undefined when none qualifies.
export function featuredSlug(selected: readonly { slug: string; privacy: string; liveUrl?: string; screenshots: readonly unknown[] }[]): string | undefined {
  return selected.find(isFeatured)?.slug;
}

type SelectedFact = ReturnType<typeof getContentFiles>["projects"]["selected"][number];

// The picture on an app's homepage card. An app with screenshots shows its image cover
// when it has one (so the best screen can lead while the gallery keeps flow order),
// otherwise its first screenshot. Without screenshots there is no card image: the card
// keeps the pattern, as before.
function cardImage(fact: SelectedFact, coverAlt: string, firstCaption: string | undefined): ImageModel | undefined {
  const [first] = fact.screenshots;
  if (!first) return undefined;
  if (fact.cover.kind === "image") {
    const { src, width, height } = fact.cover;
    return { src, width, height, alt: coverAlt };
  }
  return { ...first, alt: firstCaption ?? coverAlt };
}

export function buildApps(
  locale: Locale,
  selected: readonly SelectedFact[] = getContentFiles().projects.selected,
): AppsModel {
  const { portfolio: facts } = getContentFiles();
  const { common } = getMessages(locale);
  const copy = common.sections.apps;
  const copyBySlug = new Map(getSelectedProjects(locale).map((project) => [project.slug, project]));

  // featuredSlug picks the app; the card is the first entry with that slug that itself
  // qualifies, so two entries sharing a slug (a test fixture) can never both be featured.
  const featured = featuredSlug(selected);
  let featuredDone = false;

  const cards = selected.map((fact): AppCardModel => {
    const localized = copyBySlug.get(fact.slug as SelectedProjectSlug);
    if (!localized) throw new Error(`apps: no localized copy for project "${fact.slug}"`);
    const base = {
      slug: fact.slug,
      name: fact.name,
      contextLabel: localized.contextLabel,
      years: fact.years,
      outcome: localized.outcome,
      href: localizePath(`/work/${fact.slug}`, locale),
    };

    const image = cardImage(fact, localized.cover.alt, localized.screenshots[0]?.alt);

    if (!featuredDone && fact.slug === featured && isFeatured(fact)) {
      featuredDone = true;
      return {
        ...base,
        kind: "featured",
        screenshot: image!,
        liveUrl: fact.liveUrl!,
        stack: fact.stack.map((name) => resolveTechTag(name, facts.skillIcons)),
      };
    }

    return {
      ...base,
      kind: "private",
      // Only a truly private app may claim the confidential label.
      confidential: fact.privacy === "private",
      // Without a screenshot, an image cover degrades to a pattern.
      cover: {
        variant: fact.cover.kind === "pattern" ? fact.cover.variant : "signal",
        alt: localized.cover.alt,
      },
      ...(image ? { screenshot: image } : {}),
    };
  });

  return {
    title: copy.title,
    description: copy.description,
    privateNote: copy.privateNote,
    earlierLabel: common.actions.browseEarlierProjects,
    earlierHref: localizePath("/work/archive", locale),
    labels: {
      live: copy.live,
      viewCaseStudy: common.actions.viewCaseStudy,
      privateSystem: common.labels.privateProductionSystem,
      technologyStack: common.accessibility.technologyStack,
      openLive: common.accessibility.openLiveProduct,
      newTab: common.accessibility.opensInNewTab,
    },
    cards,
  };
}

const JOIN = " · ";

export function buildAbout(locale: Locale): AboutModel {
  const { portfolio: facts } = getContentFiles();
  const { common, portfolio } = getMessages(locale);
  const copy = common.sections.about;
  const [lead = "", ...paragraphs] = portfolio.aboutParagraphs;

  const education = facts.education.map(({ id, institution }): AboutCardModel => {
    const entry = (portfolio.education as Record<string, { program: string; period: string; result: string }>)[id];
    if (!entry) throw new Error(`about: no localized education copy for "${id}"`);

    return {
      label: copy.education,
      title: institution,
      detail: [entry.program, entry.period, entry.result].join(JOIN),
    };
  });
  const languages = facts.languages.map(({ id }) => {
    const entry = (portfolio.languages as Record<string, { name: string; proficiency: string }>)[id];
    if (!entry) throw new Error(`about: no localized language copy for "${id}"`);

    return entry;
  });

  return {
    title: copy.title,
    lead,
    paragraphs,
    cards: [
      ...education,
      {
        label: copy.languages,
        title: languages.map(({ name }) => name).join(JOIN),
        detail: languages.map(({ proficiency }) => proficiency).join(JOIN),
      },
    ],
  };
}

export function buildServices(locale: Locale): ServicesModel {
  const { portfolio: facts } = getContentFiles();
  const { common, portfolio } = getMessages(locale);
  const copy = common.sections.services;
  const bySlug = portfolio.services as Record<string, { title: string; description: string }>;

  return {
    title: copy.title,
    description: copy.description,
    processLabel: copy.process,
    stepLabel: copy.step,
    items: facts.services.map(({ id, tags }) => {
      const entry = bySlug[id];
      if (!entry) throw new Error(`services: no localized copy for "${id}"`);

      return { id, title: entry.title, description: entry.description, tags };
    }),
    steps: portfolio.process.map(({ title, description }) => ({ title, description })),
  };
}

export function buildExperience(locale: Locale): ExperienceModel {
  const { portfolio: facts } = getContentFiles();
  const { common, portfolio } = getMessages(locale);
  const copy = common.sections.experience;
  const bySlug = portfolio.experiences as Record<
    string,
    { title: string; summary: string; highlights: string[] }
  >;

  return {
    title: copy.title,
    description: copy.description,
    rows: facts.experiences.map((fact) => {
      const entry = bySlug[fact.id];
      if (!entry) throw new Error(`experience: no localized copy for "${fact.id}"`);
      // The location fact stays as written; only its city leads the row.
      const city = fact.location.split(",")[0].trim();

      return {
        id: fact.id,
        company: fact.company,
        role: entry.title,
        period: formatPeriod(
          fact.startDate as YearMonth,
          fact.endDate as YearMonth | null,
          locale,
          copy.present,
        ),
        place: `${city}${JOIN}${common.labels.workMode[fact.workMode]}`,
        summary: entry.summary,
        highlights: [...entry.highlights],
        stack: fact.stack.map((name) => resolveTechTag(name, facts.skillIcons)),
        stackLabel: common.accessibility.experienceTechnologyStack.replace("{company}", fact.company),
      };
    }),
    labels: {
      show: copy.showDetails,
      hide: copy.hideDetails,
      highlights: copy.highlightsLabel,
      stack: copy.stackLabel,
    },
  };
}

/** A group with more than five skills spans two columns. */
export const isWideGroup = (skillCount: number): boolean => skillCount > 5;

export function buildStack(locale: Locale): StackModel {
  const { portfolio: facts } = getContentFiles();
  const { common, portfolio } = getMessages(locale);
  const copy = common.sections.stack;
  const titles = portfolio.skillGroupTitles as Record<string, string>;

  return {
    title: copy.title,
    description: copy.description,
    groups: facts.skillGroups.map(({ id, skills }) => {
      const title = titles[id];
      if (!title) throw new Error(`stack: no localized title for skill group "${id}"`);

      return {
        id,
        title,
        tags: skills.map((name) => resolveTechTag(name, facts.skillIcons)),
        wide: isWideGroup(skills.length),
      };
    }),
  };
}

type TestimonialFact = { id: string; name: string; company: string };

export function buildTestimonials(
  locale: Locale,
  testimonials: readonly TestimonialFact[] = getContentFiles().portfolio.testimonials,
  bySlug: Record<string, { quote: string; role: string }> = getMessages(locale).portfolio
    .testimonials as Record<string, { quote: string; role: string }>,
): TestimonialsModel {
  const { common } = getMessages(locale);

  return {
    title: common.sections.testimonials.title,
    items: testimonials.map(({ id, name, company }) => {
      const entry = bySlug[id];
      if (!entry) throw new Error(`testimonials: no localized copy for "${id}"`);

      return { id, quote: entry.quote, name, role: entry.role, company };
    }),
  };
}

export function buildLab(locale: Locale): LabModel {
  const { portfolio: facts } = getContentFiles();
  const { common, portfolio } = getMessages(locale);
  const copy = common.sections.lab;
  const bySlug = portfolio.lab as Record<string, { description: string }>;
  const archive = new Map(getArchiveProjects(locale).map((project) => [project.id, project]));

  return {
    title: copy.title,
    description: copy.description,
    newTabLabel: common.accessibility.opensInNewTab,
    items: facts.lab.map((fact) => {
      if (fact.source === "archive") {
        const project = archive.get(fact.archiveId);
        if (!project?.repositoryUrl) throw new Error(`lab: archive project "${fact.archiveId}" has no repository`);

        return {
          id: fact.id,
          name: project.name,
          description: project.descriptor,
          url: project.repositoryUrl,
          stack: project.stack.map((name) => resolveTechTag(name, facts.skillIcons)),
        };
      }
      const entry = bySlug[fact.id];
      if (!entry) throw new Error(`lab: no localized copy for "${fact.id}"`);

      return {
        id: fact.id,
        name: fact.name,
        description: entry.description,
        url: fact.url,
        stack: fact.stack.map((name) => resolveTechTag(name, facts.skillIcons)),
      };
    }),
  };
}

type SiteFile = ReturnType<typeof getContentFiles>["site"];

export function buildContact(locale: Locale, site: SiteFile = getContentFiles().site): ContactModel {
  const { common, portfolio } = getMessages(locale);
  const { actions, sections } = common;
  const copy = sections.contact;
  // An editor can drop a link; the matching action then drops with it.
  const social = (id: SocialLink["id"]) => site.socialLinks.find((link) => link.id === id);
  const external = (id: SocialLink["id"], label: string): ContactAction[] => {
    const link = social(id);

    return link ? [{ label, href: link.href, external: true }] : [];
  };

  return {
    label: copy.label,
    titleLead: copy.titleLead,
    titleAccent: copy.titleAccent,
    availability: portfolio.profile.availability,
    newTabLabel: common.accessibility.opensInNewTab,
    paths: [
      {
        kind: "hiring",
        ...copy.hiring,
        actions: [
          { label: actions.downloadResume, href: site.profile.resumePath, external: false },
          ...external("linkedIn", "LinkedIn"),
        ],
      },
      {
        kind: "freelance",
        ...copy.freelance,
        actions: [
          { label: actions.emailMe, href: `mailto:${site.profile.email}`, external: false },
          ...external("whatsApp", "WhatsApp"),
        ],
      },
    ],
    email: site.profile.email,
    socials: site.socialLinks
      .filter(({ id }) => id !== "email")
      .map(({ id, href }) => ({ id, label: SOCIAL_LINK_LABELS[id], href })),
  };
}

export function getHomeModel(locale: Locale): HomeModel {
  return {
    sections: getHomeSections(),
    hero: buildHero(locale),
    bento: buildBento(locale),
    apps: buildApps(locale),
    about: buildAbout(locale),
    services: buildServices(locale),
    experience: buildExperience(locale),
    stack: buildStack(locale),
    testimonials: buildTestimonials(locale),
    lab: buildLab(locale),
    contact: buildContact(locale),
  };
}

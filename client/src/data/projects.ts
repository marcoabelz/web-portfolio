import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/locale";
import type {
  ArchiveProject,
  ArchiveProjectId,
  CaseStudyContent,
  ProjectContextId,
  SelectedProject,
  SelectedProjectSlug,
} from "@/types/portfolio";

const SELECTED_PROJECT_FACTS = [
  {
    slug: "satellyte",
    contextId: "production",
    name: "Satellyte",
    stack: ["Next.js", "Fastify", "BullMQ", "PostgreSQL", "Redis", "Playwright", "Docker", "GitHub Actions"],
    privacy: "public",
    liveUrl: "https://satellyte.ai",
    cover: { kind: "abstract", variant: "satellyte" },
  },
  {
    slug: "palmgrade",
    contextId: "production",
    name: "Palmgrade",
    stack: ["Python", "FastAPI", "YOLO", "OpenCV", "TensorRT", "Next.js", "PostgreSQL", "Docker"],
    privacy: "private",
    cover: { kind: "abstract", variant: "vision" },
  },
  {
    slug: "ai-recruitment-platform",
    contextId: "commercial",
    name: "AI Recruitment Platform",
    stack: ["TypeScript", "Next.js", "Node.js", "PostgreSQL", "Redis", "Stripe", "LLM APIs"],
    privacy: "private",
    cover: { kind: "abstract", variant: "recruitment" },
  },
  {
    slug: "internal-erp-platform",
    contextId: "internal",
    name: "Internal ERP Platform",
    stack: ["TypeScript", "Next.js", "React", "Node.js", "Express.js", "PostgreSQL", "MongoDB"],
    privacy: "private",
    cover: { kind: "image", src: "/work/internal-erp.jpg" },
  },
  {
    slug: "factory-monitoring-system",
    contextId: "production",
    name: "Factory Monitoring System",
    stack: ["MQTT", "Node-RED", "TimescaleDB", "Grafana", "TypeScript", "Telegram API", "Docker"],
    privacy: "private",
    cover: { kind: "abstract", variant: "monitoring" },
  },
] as const;

export function getSelectedProjectSlugs(): readonly SelectedProjectSlug[] {
  return SELECTED_PROJECT_FACTS.map(({ slug }) => slug);
}

const ARCHIVE_PROJECT_FACTS = [
  {
    id: "nutrical",
    contextId: "commercial",
    name: "Nutrical",
    stack: ["Next.js", "TypeScript", "TanStack Query", "Express.js", "Prisma", "Excel"],
    coverSrc: "/work/archive/nutrical.jpg",
  },
  {
    id: "zamasto",
    contextId: "commercial",
    name: "Zamasto",
    stack: ["React", "Node.js", "Express.js", "PostgreSQL", "Google Apps Script"],
    coverSrc: "/work/archive/zamasto.png",
  },
  {
    id: "m-event",
    contextId: "training",
    name: "M Event",
    stack: ["React Native", "Expo", "Express.js", "PostgreSQL", "Midtrans"],
    coverSrc: "/work/archive/m-event.jpg",
  },
  {
    id: "xiaopee",
    contextId: "training",
    name: "Xiaopee",
    stack: ["Next.js", "TypeScript", "MongoDB", "DaisyUI"],
    coverSrc: "/work/archive/xiaopee.png",
    repositoryUrl: "https://github.com/marcoabelz/xiaopee",
  },
  {
    id: "instaclone",
    contextId: "training",
    name: "Instaclone",
    stack: ["React Native", "Expo", "GraphQL", "MongoDB", "Redis"],
    coverSrc: "/work/archive/instaclone.jpg",
    repositoryUrl: "https://github.com/marcoabelz/instaclone",
  },
  {
    id: "chatting-app",
    contextId: "training",
    name: "Chatting App",
    stack: ["JavaScript", "Socket.IO", "Firebase"],
    coverSrc: "/work/archive/chatting-app.png",
  },
  {
    id: "omahucok",
    contextId: "training",
    name: "Omahucok",
    stack: ["React", "Express.js", "PostgreSQL", "Tailwind CSS", "Midtrans"],
    coverSrc: "/work/archive/omahucok.png",
    repositoryUrl: "https://github.com/marcoabelz/IP-HCK71",
  },
] as const satisfies readonly {
  readonly id: ArchiveProjectId;
  readonly contextId: Extract<ProjectContextId, "commercial" | "training">;
  readonly name: string;
  readonly stack: readonly string[];
  readonly coverSrc: string;
  readonly repositoryUrl?: `https://github.com/${string}`;
}[];

const copyCaseStudy = (caseStudy: CaseStudyContent): CaseStudyContent => ({
  overview: [...caseStudy.overview],
  features: [...caseStudy.features],
  responsibilities: [...caseStudy.responsibilities],
});

// Only projects cleared for public screenshots have any; the rest fall back to
// the sanitized cover. Captions live in the catalogs and pair by index.
const SCREENSHOT_FACTS: Partial<Record<SelectedProjectSlug, readonly string[]>> = {
  satellyte: [
    "/work/satellyte/satellyte-1.png",
    "/work/satellyte/satellyte-2.png",
    "/work/satellyte/satellyte-3.png",
    "/work/satellyte/satellyte-4.png",
    "/work/satellyte/satellyte-5.png",
  ],
};

export function getSelectedProjects(locale: Locale): readonly SelectedProject[] {
  const copy = getMessages(locale).projects.selected;

  return SELECTED_PROJECT_FACTS.map((fact): SelectedProject => {
    const localized = copy[fact.slug];
    const cover = fact.cover.kind === "image"
      ? { kind: "image" as const, src: fact.cover.src, alt: localized.cover.alt }
      : { kind: "abstract" as const, variant: fact.cover.variant, alt: localized.cover.alt };
    const captions = "screenshots" in localized ? localized.screenshots : [];
    const screenshots = (SCREENSHOT_FACTS[fact.slug] ?? []).map((src, index) => ({
      src,
      alt: captions[index] ?? localized.cover.alt,
    }));
    const localizedFields = {
      descriptor: localized.descriptor,
      contextLabel: localized.contextLabel,
      role: localized.role,
      outcome: localized.outcome,
      highlights: [localized.highlights[0], localized.highlights[1], localized.highlights[2]] as const,
      screenshots,
      caseStudy: copyCaseStudy(localized.caseStudy),
    };

    if (fact.privacy === "public") {
      return {
        slug: fact.slug,
        contextId: fact.contextId,
        name: fact.name,
        stack: [...fact.stack],
        privacy: "public",
        liveUrl: fact.liveUrl,
        cover,
        ...localizedFields,
      };
    }

    return {
      slug: fact.slug,
      contextId: fact.contextId,
      name: fact.name,
      stack: [...fact.stack],
      privacy: "private",
      cover,
      ...localizedFields,
    };
  });
}

export function getArchiveProjects(locale: Locale): readonly ArchiveProject[] {
  const copy = getMessages(locale).projects.archive;

  return ARCHIVE_PROJECT_FACTS.map((fact): ArchiveProject => {
    const localized = copy[fact.id];
    const project = {
      id: fact.id,
      contextId: fact.contextId,
      name: fact.name,
      descriptor: localized.descriptor,
      contextLabel: localized.contextLabel,
      stack: [...fact.stack],
      cover: { src: fact.coverSrc, alt: localized.coverAlt },
    };

    return "repositoryUrl" in fact
      ? { ...project, repositoryUrl: fact.repositoryUrl }
      : project;
  });
}

export function getProject(slug: string, locale: Locale): SelectedProject | undefined {
  return getSelectedProjects(locale).find((project) => project.slug === slug);
}

export type { SelectedProjectSlug };

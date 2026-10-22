import { z } from "zod";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YEAR_MONTH = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;
const ASSET_PATH = /^\/[A-Za-z0-9/_.-]+\.(png|jpe?g|webp|avif|svg|pdf)$/;

const text = z.string().trim().min(1);
const slug = z.string().regex(SLUG, "Must be a lowercase slug such as \"my-app\".");
const yearMonth = z.string().regex(YEAR_MONTH, "Must be a month written YYYY-MM.");
const assetPath = z.string().regex(ASSET_PATH, "Must be a site path to an image or PDF.");
export const pdfPath = assetPath.regex(/\.pdf$/, "Must be a PDF.");
const httpsUrl = z.string().regex(/^https:\/\/\S+$/, "Must start with https://.");
const githubUrl = z.string().regex(/^https:\/\/github\.com\/\S+$/, "Must start with https://github.com/.");

const imageFact = z.strictObject({
  src: assetPath,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const skillIcon = z.strictObject({
  name: text,
  icon: text.nullable(),
  monogram: z.string().min(1).max(3).optional(),
});

const socialLink = z
  .strictObject({
    id: z.enum(["email", "linkedIn", "gitHub", "whatsApp"]),
    href: text,
  })
  .superRefine((link, ctx) => {
    const prefix = link.id === "email" ? "mailto:" : "https://";

    if (!link.href.startsWith(prefix)) {
      ctx.addIssue({ code: "custom", path: ["href"], message: `Must start with ${prefix}` });
    }
  });

const homeSectionId = z.enum([
  "apps",
  "about",
  "services",
  "experience",
  "stack",
  "testimonials",
  "lab",
  "contact",
]);

export const siteFileSchema = z.strictObject({
  profile: z.strictObject({
    name: text,
    nickname: text,
    email: z.email(),
    city: text,
    country: text,
    timezone: text,
    resumePath: pdfPath,
    portrait: imageFact,
  }),
  socialLinks: z.array(socialLink),
  heroFacts: z.strictObject({ experience: text, shipped: text }),
  dailyStack: z.array(text),
  sections: z.array(z.strictObject({ id: homeSectionId, visible: z.boolean() })),
});

export const portfolioFileSchema = z.strictObject({
  experiences: z.array(
    z.strictObject({
      id: slug,
      company: text,
      location: text,
      workMode: z.enum(["onsite", "hybrid", "remote"]),
      startDate: yearMonth,
      endDate: yearMonth.nullable(),
      stack: z.array(text),
    }),
  ),
  skillGroups: z.array(z.strictObject({ id: slug, skills: z.array(text) })),
  skillIcons: z.array(skillIcon),
  education: z.array(z.strictObject({ id: slug, institution: text })),
  languages: z.array(z.strictObject({ id: slug })),
  services: z.array(z.strictObject({ id: slug, tags: z.array(text) })),
  testimonials: z.array(z.strictObject({ id: slug, name: text, company: text })),
  lab: z.array(
    z.discriminatedUnion("source", [
      z.strictObject({ id: slug, source: z.literal("archive"), archiveId: slug }),
      z.strictObject({
        id: slug,
        source: z.literal("repo"),
        name: text,
        url: githubUrl,
        stack: z.array(text),
      }),
    ]),
  ),
});

const projectCover = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("pattern"),
    variant: z.enum(["signal", "vision", "talent", "telemetry"]),
  }),
  z.strictObject({
    kind: z.literal("image"),
    src: assetPath,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
]);

export const projectsFileSchema = z.strictObject({
  selected: z.array(
    z.strictObject({
      slug,
      contextId: z.enum(["production", "commercial", "internal"]),
      name: text,
      years: text,
      privacy: z.enum(["public", "private"]),
      liveUrl: httpsUrl.optional(),
      stack: z.array(text),
      cover: projectCover,
      screenshots: z.array(imageFact),
    }),
  ),
  archive: z.array(
    z.strictObject({
      id: slug,
      contextId: z.enum(["commercial", "training"]),
      name: text,
      stack: z.array(text),
      cover: imageFact,
      repositoryUrl: githubUrl.optional(),
    }),
  ),
});

export type SiteFile = z.infer<typeof siteFileSchema>;
export type PortfolioFile = z.infer<typeof portfolioFileSchema>;
export type ProjectsFile = z.infer<typeof projectsFileSchema>;
export type ContentFiles = { site: SiteFile; portfolio: PortfolioFile; projects: ProjectsFile };
export type ContentFileName = keyof ContentFiles;
export type SkillIcon = z.infer<typeof skillIcon>;
export type ImageFact = z.infer<typeof imageFact>;
export type WorkMode = PortfolioFile["experiences"][number]["workMode"];
export type HomeSectionId = z.infer<typeof homeSectionId>;

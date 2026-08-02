import { SITE } from "@/lib/site";

export const SOCIAL_IMAGE_IDENTITY = Object.freeze({
  name: SITE.name,
  role: "Full-Stack Engineer",
  mark: "MAZ",
  category: "WEB",
  year: "2026",
  eyebrow: "Product engineering / systems / delivery",
  description:
    "Production-grade SaaS, AI systems, and infrastructure—from interface to deployment.",
  location: "Jakarta",
  country: "Indonesia",
} as const);

export const SHARED_SOCIAL_IMAGE = {
  path: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SOCIAL_IMAGE_IDENTITY.name} — ${SOCIAL_IMAGE_IDENTITY.role}`,
  type: "image/png",
} as const;

export function getSharedSocialImage(siteUrl: string) {
  return {
    url: new URL(SHARED_SOCIAL_IMAGE.path, siteUrl).href,
    width: SHARED_SOCIAL_IMAGE.width,
    height: SHARED_SOCIAL_IMAGE.height,
    alt: SHARED_SOCIAL_IMAGE.alt,
    type: SHARED_SOCIAL_IMAGE.type,
  };
}

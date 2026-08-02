import { describe, expect, it } from "vitest";

import { SITE } from "@/lib/site";
import {
  SHARED_SOCIAL_IMAGE,
  SOCIAL_IMAGE_IDENTITY,
} from "@/lib/social-image";

describe("locale-neutral social image identity", () => {
  it("uses the canonical site name with frozen locale-neutral artwork copy", () => {
    expect(Object.isFrozen(SOCIAL_IMAGE_IDENTITY)).toBe(true);
    expect(SOCIAL_IMAGE_IDENTITY).toEqual({
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
    });
  });

  it("derives the shared alt from the canonical identity", () => {
    expect(SHARED_SOCIAL_IMAGE.alt).toBe(
      `${SOCIAL_IMAGE_IDENTITY.name} — ${SOCIAL_IMAGE_IDENTITY.role}`,
    );
  });
});

import { describe, expect, it } from "vitest";

import { navigationFor, resolveHomeSections } from "@/components/sections/registry";

const labels = {
  apps: "Apps",
  about: "About",
  services: "Services",
  experience: "Experience",
  contact: "Contact",
};

describe("resolveHomeSections", () => {
  it("keeps config order, drops hidden and empty sections, and numbers without gaps", () => {
    const config = [
      { id: "apps", visible: true },
      { id: "about", visible: false },
      { id: "testimonials", visible: true },
      { id: "contact", visible: true },
    ] as const;

    expect(resolveHomeSections(config, (id) => id === "testimonials")).toEqual([
      { id: "apps", number: "01" },
      { id: "contact", number: "02" },
    ]);
  });
});

describe("navigationFor", () => {
  it("lists only visible nav sections, in page order", () => {
    const items = navigationFor(
      [
        { id: "contact", number: "01" },
        { id: "stack", number: "02" },
        { id: "apps", number: "03" },
      ],
      labels,
    );

    expect(items.map((item) => item.href)).toEqual(["/#contact", "/#apps"]);
    expect(items.map((item) => item.label)).toEqual(["Contact", "Apps"]);
  });
});

import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The editor is behind a password anyway; keeping it out of the index keeps it
      // off the list of login pages crawlers hand to scanners.
      disallow: "/admin",
    },
    sitemap: new URL("/sitemap.xml", SITE.url).href,
  };
}

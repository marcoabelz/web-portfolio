import { createHash } from "node:crypto";

// A short fingerprint of the logo slugs the sprite is built from. It rides on the sprite URL
// (`/icons.svg?v=...`) so a browser holding an hour-old sprite fetches a new one as soon as
// the editor adds a slug. Plain .mjs so next.config.mjs can import it at build time.
export function iconSpriteVersion(slugs) {
  const distinct = Array.from(new Set(slugs.filter((slug) => typeof slug === "string" && slug))).sort();
  return createHash("sha256").update(distinct.join(",")).digest("hex").slice(0, 8);
}

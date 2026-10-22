// Where the shared logo sprite is served from (src/app/icons.svg/route.ts). Chips reference
// `#si-{slug}` inside it, so each logo's path is sent once instead of once per chip. Kept
// out of icons.ts, which is server-only, because TechChip also renders inside a client island.
//
// The version is a build-time constant (next.config.mjs hashes the skillIcons slugs into
// NEXT_PUBLIC_ICON_SPRITE_VERSION), so it reaches client code without importing simple-icons.
export function iconSpriteUrl(version: string | undefined): string {
  return version ? `/icons.svg?v=${version}` : "/icons.svg";
}

export const ICON_SPRITE_URL = iconSpriteUrl(process.env.NEXT_PUBLIC_ICON_SPRITE_VERSION);

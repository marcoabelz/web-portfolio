import { readFileSync } from "node:fs";

import createNextIntlPlugin from "next-intl/plugin";

import { iconSpriteVersion } from "./src/lib/icons-version.mjs";

const skillIcons = JSON.parse(readFileSync(new URL("./content/portfolio.json", import.meta.url), "utf8")).skillIcons;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The editor uploads files up to 4 MB through a server action; the default is 1 MB.
  // 4 MB is also bound by the hosting's 4.5 MB request cap, so raising this alone won't help.
  env: { NEXT_PUBLIC_ICON_SPRITE_VERSION: iconSpriteVersion(skillIcons.map((item) => item.icon)) },
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

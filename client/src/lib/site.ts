import content from "../../content/site.json";

const LOCAL_SITE_URL = "http://localhost:3000";

function getLocalFallback(environment: string | undefined): URL {
  if (environment === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) origin in production.");
  }

  return new URL(LOCAL_SITE_URL);
}

export function getSiteUrl(
  value: string | undefined,
  environment: string | undefined = process.env.NODE_ENV,
): URL {
  if (!value) {
    return getLocalFallback(environment);
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return getLocalFallback(environment);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return getLocalFallback(environment);
  }

  return new URL(parsed.origin);
}

export const SITE = {
  name: content.profile.name,
  url: getSiteUrl(process.env.NEXT_PUBLIC_SITE_URL).href,
} as const;

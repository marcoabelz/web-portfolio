import { routing } from "./routing";

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    routing.locales.some((locale) => locale === value)
  );
}

function splitHash(path: string): [pathname: string, hash: string] {
  const hashIndex = path.indexOf("#");

  if (hashIndex === -1) {
    return [path, ""];
  }

  return [path.slice(0, hashIndex), path.slice(hashIndex)];
}

function normalizePathname(pathname: string): string {
  const pathWithoutLeadingSlashes = pathname.replace(/^\/+/, "");
  return pathWithoutLeadingSlashes ? `/${pathWithoutLeadingSlashes}` : "/";
}

export function canonicalPath(path: string): string {
  const [pathname, hash] = splitHash(path);
  const normalizedPathname = normalizePathname(pathname);
  const [, firstSegment] = normalizedPathname.split("/");

  if (!isLocale(firstSegment)) {
    return `${normalizedPathname}${hash}`;
  }

  const pathWithoutLocale = normalizedPathname.slice(firstSegment.length + 1);
  const canonicalPathname = pathWithoutLocale || "/";

  return `${canonicalPathname}${hash}`;
}

export function localizePath(path: string, locale: Locale): string {
  const canonical = canonicalPath(path);
  const [pathname, hash] = splitHash(canonical);

  if (locale === routing.defaultLocale) {
    return canonical;
  }

  const localizedPathname =
    pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return `${localizedPathname}${hash}`;
}

export function languageAlternates(path: string): Record<Locale, string> {
  const canonical = canonicalPath(path);

  return {
    en: localizePath(canonical, "en"),
    id: localizePath(canonical, "id"),
  };
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("localized app shell boundaries", () => {
  it("owns a single client provider and never serializes the full catalog", () => {
    const localeLayout = read("./[locale]/layout.tsx");

    expect(localeLayout.match(/<NextIntlClientProvider/g)).toHaveLength(1);
    expect(localeLayout).toContain("messages={EMPTY_INTL_MESSAGES}");
  });

  it("renders the shell inside the locale segment so language switches re-render it", () => {
    // A root layout is never re-rendered on a client-side locale switch, which
    // left the header showing the previous language until a hard refresh. It
    // stays a passthrough for the metadata routes that live outside [locale].
    expect(read("./layout.tsx")).not.toContain("<SiteHeader");
    expect(read("./[locale]/layout.tsx")).toContain("<SiteHeader");
  });

  it("keeps full content registries outside interactive shell components", () => {
    const clientShellSources = [
      read("../components/layout/SiteHeader.tsx"),
      read("../components/layout/LanguageSwitcher.tsx"),
      read("../components/layout/ThemeToggle.tsx"),
      read("../components/layout/ScrollToTop.tsx"),
    ];

    for (const source of clientShellSources) {
      expect(source).not.toContain("@/data/portfolio");
      expect(source).not.toContain("@/i18n/messages");
      expect(source).not.toContain("useTranslations");
    }
  });
});

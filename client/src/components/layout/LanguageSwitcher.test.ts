import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  getLanguageSwitchOptions,
  LanguageSwitcherView,
  subscribeToHashChanges,
} from "@/components/layout/LanguageSwitcher";

const TestIntlProvider = NextIntlClientProvider as unknown as ComponentType<{
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string;
  children?: ReactNode;
}>;

const englishLanguageNames = {
  english: "English",
  indonesian: "Indonesia",
};

function renderSwitcher(
  locale: "en" | "id",
  pathname: string,
  labels: {
    selector: string;
    english: string;
    indonesian: string;
    switchTo: (language: string) => string;
  },
): string {
  return renderToStaticMarkup(
    createElement(
      TestIntlProvider,
      {
        locale,
        messages: {} as AbstractIntlMessages,
        timeZone: "Asia/Jakarta",
      },
      createElement(LanguageSwitcherView, { locale, pathname, labels }),
    ),
  );
}

describe("getLanguageSwitchOptions", () => {
  if (false) {
    // @ts-expect-error Localized language names are required at every call site.
    getLanguageSwitchOptions("/");
  }

  it("uses an unprefixed English homepage and an Indonesian prefix", () => {
    expect(getLanguageSwitchOptions("/", englishLanguageNames).map(({ href }) => href)).toEqual([
      "/",
      "/",
    ]);
    expect(getLanguageSwitchOptions("/id", englishLanguageNames).map(({ href }) => href)).toEqual([
      "/",
      "/",
    ]);
  });

  it("preserves the logical project pathname and slug", () => {
    expect(
      getLanguageSwitchOptions("/id/work/palmgrade", englishLanguageNames).map(({ href }) => href),
    ).toEqual(["/work/palmgrade", "/work/palmgrade"]);
  });

  it("preserves homepage section hashes", () => {
    expect(getLanguageSwitchOptions("/id#experience", englishLanguageNames).map(({ href }) => href)).toEqual([
      "/#experience",
      "/#experience",
    ]);
  });
});

describe("LanguageSwitcherView", () => {
  it("marks the active language and fully labels both options", () => {
    const html = renderSwitcher("id", "/id/work/palmgrade", {
      selector: "Bahasa",
      english: "English",
      indonesian: "Indonesia",
      switchTo: (language: string) => `Ubah bahasa ke ${language}`,
    });

    expect(html).toContain('aria-label="Bahasa"');
    expect(html).toContain('aria-label="Ubah bahasa ke English"');
    expect(html).toContain('aria-label="Ubah bahasa ke Indonesia"');
    expect(html).toContain('aria-current="page"');
    // Explicit locale prefixes are required at the transition boundary so
    // next-intl can update NEXT_LOCALE before canonicalizing English to `/`.
    expect(html).toContain('href="/en/work/palmgrade"');
    expect(html).toContain('href="/id/work/palmgrade"');
    expect(html).toContain("EN");
    expect(html).toContain("ID");
  });

  it("renders client-navigation hrefs that preserve a homepage hash", () => {
    const html = renderSwitcher("en", "/#experience", {
      selector: "Language",
      english: "English",
      indonesian: "Indonesia",
      switchTo: (language: string) => `Switch language to ${language}`,
    });

    expect(html).toContain('href="/en#experience"');
    expect(html).toContain('href="/id#experience"');
  });
});

describe("subscribeToHashChanges", () => {
  it("syncs immediately, reacts to same-path hash changes, and cleans up", () => {
    let hashChangeListener: (() => void) | undefined;
    const source = {
      location: { hash: "#work" },
      addEventListener: vi.fn((_type: "hashchange", listener: () => void) => {
        hashChangeListener = listener;
      }),
      removeEventListener: vi.fn(),
    };
    const onHashChange = vi.fn();

    const unsubscribe = subscribeToHashChanges(source, onHashChange);
    expect(onHashChange).toHaveBeenLastCalledWith("#work");

    source.location.hash = "#about";
    hashChangeListener?.();
    expect(onHashChange).toHaveBeenLastCalledWith("#about");

    unsubscribe();
    expect(source.removeEventListener).toHaveBeenCalledWith("hashchange", hashChangeListener);
  });
});

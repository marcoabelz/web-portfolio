"use client";

import React, { useEffect, useState } from "react";

import { canonicalPath, type Locale } from "@/i18n/locale";
import { Link, usePathname } from "@/i18n/navigation";

type LanguageOption = {
  readonly locale: Locale;
  readonly shortLabel: "EN" | "ID";
  readonly language: string;
  readonly href: string;
};

export type LanguageSwitcherLabels = {
  readonly selector: string;
  readonly english: string;
  readonly indonesian: string;
  readonly switchTo: string;
};

type LanguageViewLabels = Omit<LanguageSwitcherLabels, "switchTo"> & {
  readonly switchTo: (language: string) => string;
};

type HashChangeSource = {
  readonly location: { readonly hash: string };
  addEventListener(type: "hashchange", listener: () => void): void;
  removeEventListener(type: "hashchange", listener: () => void): void;
};

export function subscribeToHashChanges(
  source: HashChangeSource,
  onHashChange: (hash: string) => void,
): () => void {
  const syncHash = () => onHashChange(source.location.hash);

  syncHash();
  source.addEventListener("hashchange", syncHash);

  return () => source.removeEventListener("hashchange", syncHash);
}

export function getLanguageSwitchOptions(
  pathname: string,
  labels: Pick<LanguageSwitcherLabels, "english" | "indonesian">,
): readonly LanguageOption[] {
  const href = canonicalPath(pathname);

  return [
    {
      locale: "en",
      shortLabel: "EN",
      language: labels.english,
      href,
    },
    {
      locale: "id",
      shortLabel: "ID",
      language: labels.indonesian,
      href,
    },
  ];
}

// Flag emoji do not render on Windows, so the flags are inline shapes. They sit
// next to the EN/ID text, so they stay decorative.
const FLAG_CLASS = "h-3 w-[1.125rem] shrink-0 ring-1 ring-line";

function Flag({ locale }: { readonly locale: Locale }) {
  if (locale === "id") {
    return (
      <svg aria-hidden="true" viewBox="0 0 60 40" className={FLAG_CLASS}>
        <rect width="60" height="20" fill="#CE1126" />
        <rect y="20" width="60" height="20" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 60 40" className={FLAG_CLASS}>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0V40M0 20H60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

export function LanguageSwitcherView({
  locale,
  pathname,
  labels,
}: {
  readonly locale: Locale;
  readonly pathname: string;
  readonly labels: LanguageViewLabels;
}) {
  const options = getLanguageSwitchOptions(pathname, labels);

  return (
    <div
      role="group"
      aria-label={labels.selector}
      className="flex h-9 shrink-0 items-center border border-line bg-surface p-0.5"
    >
      {options.map((option) => {
        const isActive = option.locale === locale;

        return (
          <Link
            key={option.locale}
            href={option.href}
            locale={option.locale}
            // Same page in another language: Next scrolls to the top on every
            // navigation, which threw the reader back to the hero.
            scroll={false}
            aria-label={labels.switchTo(option.language)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-8 items-center justify-center gap-1.5 px-1.5 font-mono text-[0.6875rem] font-bold tracking-wide transition-colors ${
              isActive ? "bg-ink text-canvas" : "text-muted hover:text-accent"
            }`}
          >
            <Flag locale={option.locale} />
            {option.shortLabel}
          </Link>
        );
      })}
    </div>
  );
}

export function LanguageSwitcher({
  locale,
  labels,
}: {
  readonly locale: Locale;
  readonly labels: LanguageSwitcherLabels;
}) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => subscribeToHashChanges(window, setHash), [pathname]);

  return (
    <LanguageSwitcherView
      locale={locale}
      pathname={`${pathname}${hash}`}
      labels={{
        ...labels,
        switchTo: (language) => labels.switchTo.replace("{language}", language),
      }}
    />
  );
}

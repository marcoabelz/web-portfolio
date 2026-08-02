"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import icon from "@/app/icon.svg";

import type { Locale } from "@/i18n/locale";
import { Link, usePathname } from "@/i18n/navigation";
import type { HomeSectionId, NavigationItem } from "@/types/portfolio";
import { Container } from "@/components/ui/Container";
import {
  LanguageSwitcher,
  type LanguageSwitcherLabels,
} from "@/components/layout/LanguageSwitcher";
import { ThemeToggle, type ThemeToggleLabels } from "@/components/layout/ThemeToggle";
import Image from "next/image";

function sectionIdFromHref(href: `/#${HomeSectionId}`): HomeSectionId {
  return href.slice(2) as HomeSectionId;
}

type SiteHeaderProps = Readonly<{
  locale: Locale;
  navigation: readonly NavigationItem[];
  profile: Readonly<{ name: string; resumePath: string }>;
  labels: Readonly<{
    home: string;
    logo: string;
    primaryNavigation: string;
    mobileNavigation: string;
    openNavigation: string;
    closeNavigation: string;
    resume: string;
    language: LanguageSwitcherLabels;
    theme: ThemeToggleLabels;
  }>;
}>;

export function SiteHeader({ locale, navigation, profile, labels }: SiteHeaderProps) {
  const pathname = usePathname();
  const sectionIds = useMemo(
    () => navigation.map(({ href }) => sectionIdFromHref(href)),
    [navigation],
  );
  const homeLinkRef = useRef<HTMLAnchorElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<HomeSectionId | null>(
    null,
  );

  useEffect(() => {
    const sections = sectionIds.map((id) =>
      document.getElementById(id),
    ).filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0 || typeof IntersectionObserver === "undefined") {
      setActiveSection(null);
      return;
    }

    const visibleSections = new Map<HomeSectionId, number>();
    let observer: IntersectionObserver | null = null;

    const createObserver = () => {
      observer?.disconnect();
      visibleSections.clear();

      const topMargin = Math.round(window.innerHeight * 0.28);
      const bottomMargin = Math.round(window.innerHeight * 0.62);

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const sectionId = entry.target.id as HomeSectionId;

            if (entry.isIntersecting)
              visibleSections.set(sectionId, entry.intersectionRatio);
            else visibleSections.delete(sectionId);
          });

          const nextActiveSection =
            sectionIds.reduce<HomeSectionId | null>(
              (current, sectionId) => {
                if (!visibleSections.has(sectionId)) return current;
                if (current === null) return sectionId;

                return visibleSections.get(sectionId)! >
                  visibleSections.get(current)!
                  ? sectionId
                  : current;
              },
              null,
            );

          setActiveSection(nextActiveSection);
        },
        { rootMargin: `-${topMargin}px 0px -${bottomMargin}px 0px` },
      );

      sections.forEach((section) => observer?.observe(section));
    };

    createObserver();
    window.addEventListener("resize", createObserver);

    return () => {
      window.removeEventListener("resize", createObserver);
      observer?.disconnect();
    };
  }, [pathname, sectionIds]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) return;

      const activeElement = document.activeElement;
      const focusWillBeHidden =
        activeElement === menuToggleRef.current ||
        (activeElement !== null &&
          mobileNavigationRef.current?.contains(activeElement));

      setIsOpen(false);
      if (focusWillBeHidden) homeLinkRef.current?.focus();
    };

    if (desktopMedia.matches) setIsOpen(false);
    desktopMedia.addEventListener("change", closeOnDesktop);

    return () => desktopMedia.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuToggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const closeNavigationAndRestoreFocus = () => {
    setIsOpen(false);
    window.requestAnimationFrame(() => menuToggleRef.current?.focus());
  };

  return (
    <header className="sticky top-0 z-50 min-h-16 border-b border-line bg-canvas">
      <Container className="flex min-h-16 items-center justify-between gap-3">
        <Link
          ref={homeLinkRef}
          href="/"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center font-mono text-sm font-bold tracking-[0.24em] text-ink transition-colors hover:text-accent"
          onClick={() => setIsOpen(false)}
          aria-label={labels.home}
        >
          <Image
            src={icon}
            alt={labels.logo}
            width={32}
            height={32}
            className="h-8 w-8"
          />
        </Link>

        {/* The row gap matches a nav link's horizontal padding, so the space
            between menu labels and the space to the controls next to them read
            as one rhythm instead of two. */}
        <div className="flex min-w-0 items-center gap-1.5 self-stretch md:gap-2.5 lg:gap-3.5">
          <nav
            aria-label={labels.primaryNavigation}
            className="hidden min-w-0 self-stretch md:block"
          >
            <ul className="flex h-full items-stretch">
              {navigation.map((item) => {
                const isActive = activeSection === sectionIdFromHref(item.href);

                return (
                  <li key={item.href} className="flex">
                    <Link
                      href={item.href}
                      className={`flex items-center border-b-2 px-2.5 text-xs font-semibold tracking-wide transition-colors lg:px-3.5 lg:text-sm ${
                        isActive
                          ? "border-accent text-ink"
                          : "border-transparent text-muted hover:border-line hover:text-ink"
                      }`}
                      aria-current={isActive ? "location" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <LanguageSwitcher locale={locale} labels={labels.language} />
          <ThemeToggle labels={labels.theme} />
          <a
            href={profile.resumePath}
            className="hidden min-h-11 items-center border border-ink bg-ink px-3.5 text-xs font-bold uppercase tracking-[0.12em] text-canvas transition-colors hover:border-accent hover:bg-accent md:inline-flex lg:px-4"
          >
            {labels.resume}
          </a>
          <button
            ref={menuToggleRef}
            type="button"
            className="inline-flex size-11 items-center justify-center border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent md:hidden"
            onClick={() => setIsOpen((current) => !current)}
            aria-label={
              isOpen
                ? labels.closeNavigation
                : labels.openNavigation
            }
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            {isOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </Container>

      <div
        ref={mobileNavigationRef}
        id="mobile-navigation"
        className="border-t border-line bg-canvas md:hidden"
        hidden={!isOpen}
      >
        <Container>
          <nav
            aria-label={labels.mobileNavigation}
            className="py-3"
          >
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = activeSection === sectionIdFromHref(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex min-h-11 items-center border-l-2 px-4 text-sm font-semibold transition-colors ${
                        isActive
                          ? "border-accent bg-elevated text-ink"
                          : "border-transparent text-muted hover:border-line hover:bg-surface hover:text-ink"
                      }`}
                      onClick={closeNavigationAndRestoreFocus}
                      aria-current={isActive ? "location" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="pt-2">
                <a
                  href={profile.resumePath}
                  className="flex min-h-11 items-center justify-center border border-ink bg-ink px-4 text-sm font-bold uppercase tracking-[0.12em] text-canvas transition-colors hover:border-accent hover:bg-accent"
                  onClick={closeNavigationAndRestoreFocus}
                >
                  {labels.resume}
                </a>
              </li>
            </ul>
          </nav>
        </Container>
      </div>
    </header>
  );
}

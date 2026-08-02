# Portfolio Internationalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete, statically rendered English and Indonesian support while preserving every current English URL and introducing equivalent `/id` routes.

**Architecture:** Use `next-intl@3.26.5` with an `as-needed` locale prefix, a dynamic `[locale]` App Router root, and domain-scoped messages. Locale-independent facts remain in typed data modules; localized copy is merged through locale-aware getters so components stay presentation-focused and no technical facts are duplicated.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, `next-intl` 3.26.5, Tailwind CSS, Vitest, route smoke tests.

---

## File Structure

### Create

- `client/src/i18n/routing.ts` — locale list, default locale, and prefix policy.
- `client/src/i18n/request.ts` — validated per-request message loading.
- `client/src/i18n/navigation.ts` — locale-aware navigation helpers.
- `client/src/i18n/locale.ts` — pure locale/path/canonical helpers.
- `client/src/i18n/messages.ts` — static message registry and structural types.
- `client/src/i18n/locale.test.ts` — locale/path helper tests.
- `client/src/i18n/messages.test.ts` — cross-locale message parity tests.
- `client/messages/en/common.json`, `portfolio.json`, `projects.json` — English UI and content copy.
- `client/messages/id/common.json`, `portfolio.json`, `projects.json` — Indonesian UI and content copy.
- `client/src/middleware.ts` — locale negotiation and URL normalization.
- `client/src/app/[locale]/layout.tsx` — localized root layout and metadata.
- `client/src/app/[locale]/page.tsx` — localized homepage.
- `client/src/app/[locale]/work/[slug]/page.tsx` — localized case studies.
- `client/src/app/[locale]/work/archive/page.tsx` — localized archive.
- `client/src/components/layout/LanguageSwitcher.tsx` — accessible locale switcher.
- `client/src/components/layout/LanguageSwitcher.test.ts` — server-markup contract test.
- `client/src/app/localized-metadata.test.ts` — localized page metadata tests.
- `client/src/app/sitemap.test.ts` — sitemap language-alternate tests.

### Modify

- `client/package.json`, `client/pnpm-lock.yaml` — compatible `next-intl` dependency.
- `client/next.config.mjs` — `next-intl` request plugin.
- `client/src/types/portfolio.ts` — IDs and localized-copy contracts.
- `client/src/data/portfolio.ts` — invariant facts and locale-aware portfolio getter.
- `client/src/data/projects.ts` — invariant facts and locale-aware project getters.
- `client/src/data/content.test.ts` — invariants and both-locale content assertions.
- `client/src/components/layout/SiteHeader.tsx` — localized labels and switcher.
- `client/src/components/layout/SiteFooter.tsx` — localized footer labels.
- `client/src/components/layout/ThemeToggle.tsx` — localized accessible label.
- `client/src/components/layout/ScrollToTop.tsx` — localized accessible label.
- `client/src/components/sections/*.tsx` — localized content and UI labels via props/getters.
- `client/src/components/work/*.tsx` — localized actions, labels, and case-study headings.
- `client/src/components/ui/ExternalLink.tsx` — localized new-tab label supplied by caller.
- `client/src/components/ui/SectionHeading.tsx` — accepts localized text unchanged.
- `client/src/app/sitemap.ts` — both locale variants and alternates.
- `client/src/app/robots.ts` — preserve root sitemap behavior.
- `client/src/app/opengraph-image.tsx` — keep locale-neutral identity art.
- `client/scripts/test-routes.mjs` — smoke-test both locale trees.

### Remove after migration

- `client/src/app/layout.tsx`
- `client/src/app/page.tsx`
- `client/src/app/work/[slug]/page.tsx`
- `client/src/app/work/archive/page.tsx`
- `client/src/app/work/metadata.test.ts`

## Task 1: Locale Foundation and Compatible Dependency

**Files:**
- Modify: `client/package.json`
- Modify: `client/pnpm-lock.yaml`
- Modify: `client/next.config.mjs`
- Create: `client/src/i18n/routing.ts`
- Create: `client/src/i18n/locale.ts`
- Create: `client/src/i18n/locale.test.ts`
- Create: `client/src/i18n/navigation.ts`
- Create: `client/src/middleware.ts`

- [ ] **Step 1: Write failing locale helper tests**

Test `isLocale`, `localizePath`, `canonicalPath`, and alternate-path generation with the exact matrix:

```ts
expect(isLocale("en")).toBe(true);
expect(isLocale("id")).toBe(true);
expect(isLocale("fr")).toBe(false);
expect(localizePath("/work/satellyte", "en")).toBe("/work/satellyte");
expect(localizePath("/work/satellyte", "id")).toBe("/id/work/satellyte");
expect(localizePath("/#work", "id")).toBe("/id#work");
expect(canonicalPath("/id/work/satellyte")).toBe("/work/satellyte");
expect(languageAlternates("/work/satellyte")).toEqual({
  en: "/work/satellyte",
  id: "/id/work/satellyte"
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run `rtk pnpm test src/i18n/locale.test.ts` from `client/`. Expected failure: locale modules do not exist.

- [ ] **Step 3: Install and configure `next-intl`**

Run `rtk pnpm add next-intl@3.26.5`. Wrap `next.config.mjs` with:

```js
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Implement routing and pure helpers**

Use `defineRouting` with locales `en`, `id`, default `en`, and `localePrefix: "as-needed"`. Path helpers must normalize a leading slash, preserve hashes, never double-prefix, and strip only a leading supported locale segment.

- [ ] **Step 5: Add locale-aware navigation and middleware**

Export `Link`, `redirect`, `usePathname`, and `useRouter` using `createNavigation(routing)`. Middleware uses `createMiddleware(routing)` and this matcher:

```ts
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 6: Verify GREEN and commit only task files**

Run `rtk pnpm test src/i18n/locale.test.ts && rtk pnpm typecheck`. Expected: all focused tests pass and zero TypeScript errors. Commit message: `feat: add locale routing foundation`.

## Task 2: Typed Domain Messages

**Files:**
- Create: `client/messages/en/common.json`
- Create: `client/messages/en/portfolio.json`
- Create: `client/messages/en/projects.json`
- Create: `client/messages/id/common.json`
- Create: `client/messages/id/portfolio.json`
- Create: `client/messages/id/projects.json`
- Create: `client/src/i18n/messages.ts`
- Create: `client/src/i18n/request.ts`
- Create: `client/src/i18n/messages.test.ts`

- [ ] **Step 1: Write failing structural-parity tests**

Implement a recursive `keyPaths` test helper and assert that each Indonesian domain has exactly the same leaf paths as English. Also assert:

```ts
expect(getMessages("en").common.language.current).toBe("English");
expect(getMessages("id").common.language.current).toBe("Indonesia");
expect(Object.keys(getMessages("en").projects.selected)).toHaveLength(5);
expect(Object.keys(getMessages("id").projects.selected)).toHaveLength(5);
expect(Object.keys(getMessages("en").projects.archive)).toHaveLength(7);
expect(Object.keys(getMessages("id").projects.archive)).toHaveLength(7);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run `rtk pnpm test src/i18n/messages.test.ts`. Expected failure: message registry does not exist.

- [ ] **Step 3: Create domain-scoped English messages**

Move every translatable string from the current UI and data files into stable keys. The required root shape is:

```ts
{
  common: {
    navigation, actions, sections, labels, accessibility, language, footer
  },
  portfolio: {
    profile, aboutFacts, aboutParagraphs, experiences, skillGroupTitles,
    education, languages
  },
  projects: {
    selected, archive, caseStudyHeadings
  }
}
```

Experience keys are `satellyte`, `nexio`, `delta`, and `sys`. Selected-project keys are their existing slugs. Archive keys are stable kebab-case IDs: `nutrical`, `zamasto`, `m-event`, `xiaopee`, `instaclone`, `chatting-app`, and `omahucok`.

- [ ] **Step 4: Create complete human-written Indonesian messages**

Translate professional prose naturally rather than word-for-word. Preserve product names, technologies, verified numbers, company names, and role conventions. Use consistent terms: `Pengalaman`, `Tentang`, `Keahlian`, `Hubungi Saya`, `Studi Kasus`, `Proyek Privat`, `Lihat Proyek Pilihan`, and `Unduh Resume`.

- [ ] **Step 5: Implement the static registry and request loader**

`getMessages(locale)` returns a statically imported merged object; it must not construct an import path from user input. `request.ts` validates `requestLocale`, calls `notFound()` for unsupported values, and returns `{locale, messages}`.

- [ ] **Step 6: Verify GREEN and commit only task files**

Run `rtk pnpm test src/i18n/messages.test.ts && rtk pnpm typecheck`. Expected: parity assertions pass and no type errors. Commit message: `feat: add bilingual portfolio messages`.

## Task 3: Localized Typed Content Getters

**Files:**
- Modify: `client/src/types/portfolio.ts`
- Modify: `client/src/data/portfolio.ts`
- Modify: `client/src/data/projects.ts`
- Modify: `client/src/data/content.test.ts`

- [ ] **Step 1: Extend failing content tests for both locales**

For each locale, assert four experiences, five selected projects, seven archive projects, nonblank narrative arrays, stable project slug order, identical stacks/URLs/dates across locales, and different English/Indonesian introductions. Assert Indonesian Satellyte outcome contains `sinyal` and English contains `signals`.

- [ ] **Step 2: Run content tests and confirm RED**

Run `rtk pnpm test src/data/content.test.ts`. Expected failure: locale-aware getters are missing.

- [ ] **Step 3: Add stable IDs and invariant fact arrays**

Introduce `ExperienceId` and `ArchiveProjectId`. Keep `PROFILE_FACTS`, `EXPERIENCE_FACTS`, `PROJECT_FACTS`, and `ARCHIVE_PROJECT_FACTS` private or explicitly named exports. These contain only invariant values.

- [ ] **Step 4: Implement locale-aware getters**

Expose:

```ts
getPortfolioContent(locale): {
  profile, aboutFacts, navigation, socialLinks, aboutParagraphs,
  experiences, skillGroups, education, languages
}
getSelectedProjects(locale): readonly SelectedProject[]
getArchiveProjects(locale): readonly ArchiveProject[]
getProject(slug, locale): SelectedProject | undefined
```

Each getter merges invariant facts with the corresponding localized message by stable ID. Preserve English compatibility exports only where root special files still require locale-neutral facts; components must migrate to getters.

- [ ] **Step 5: Verify GREEN and commit only task files**

Run `rtk pnpm test src/data/content.test.ts && rtk pnpm typecheck`. Expected: content invariants and locale differences pass. Commit message: `refactor: separate localized portfolio copy from facts`.

## Task 4: Localized App Router and Root Layout

**Files:**
- Create: `client/src/app/[locale]/layout.tsx`
- Create: `client/src/app/[locale]/page.tsx`
- Remove: `client/src/app/layout.tsx`
- Remove: `client/src/app/page.tsx`
- Modify: `client/src/components/layout/SiteHeader.tsx`
- Modify: `client/src/components/layout/SiteFooter.tsx`
- Modify: `client/src/components/layout/ThemeToggle.tsx`
- Modify: `client/src/components/layout/ScrollToTop.tsx`
- Create: `client/src/components/layout/LanguageSwitcher.tsx`
- Create: `client/src/components/layout/LanguageSwitcher.test.ts`

- [ ] **Step 1: Write failing language-switcher markup tests**

Render the switcher statically for both locales. Assert two language options, full accessible labels, `aria-current="page"` on the active language, and unprefixed English versus `/id` Indonesian hrefs for the same pathname.

- [ ] **Step 2: Run the focused test and confirm RED**

Run `rtk pnpm test src/components/layout/LanguageSwitcher.test.ts`. Expected failure: component does not exist.

- [ ] **Step 3: Create the localized root layout**

Move font, theme, JSON-LD, header, main, footer, and scroll-to-top composition into `[locale]/layout.tsx`. Validate locale, call the next-intl request-locale API, return both locale params from `generateStaticParams`, wrap children with `NextIntlClientProvider`, and set `<html lang={locale}>`.

- [ ] **Step 4: Create locale-aware shared layout controls**

Use localized accessibility labels for skip link, menu, theme toggle, scroll-to-top, resume, and footer. `LanguageSwitcher` derives the current pathname with `usePathname`, uses locale-aware links, preserves the current hash on the homepage through `window.location.hash`, and displays compact `EN` and `ID` labels.

- [ ] **Step 5: Create the localized homepage entry**

`[locale]/page.tsx` validates locale, obtains localized content once, and passes focused content slices into sections. Keep `Hero` unwrapped; retain `Reveal` wrappers for every later section.

- [ ] **Step 6: Verify GREEN and commit only task files**

Run the switcher test, full typecheck, and lint. Expected: focused test passes, no type/lint failures. Commit message: `feat: add localized app shell and language switcher`.

## Task 5: Localize Homepage Presentation Components

**Files:**
- Modify: `client/src/components/sections/Hero.tsx`
- Modify: `client/src/components/sections/SelectedWork.tsx`
- Modify: `client/src/components/sections/Experience.tsx`
- Modify: `client/src/components/sections/About.tsx`
- Modify: `client/src/components/sections/Skills.tsx`
- Modify: `client/src/components/sections/Credentials.tsx`
- Modify: `client/src/components/sections/Contact.tsx`
- Modify: `client/src/components/work/ProjectCard.tsx`
- Modify: `client/src/components/work/ProjectCover.tsx`
- Modify: `client/src/components/ui/ExternalLink.tsx`

- [ ] **Step 1: Add failing localized-homepage assertions**

Extend message/content tests to assert every visible homepage heading and CTA exists in both locales, and ensure image alternative text is nonblank in both locales.

- [ ] **Step 2: Run focused tests and confirm RED**

Run `rtk pnpm test src/i18n/messages.test.ts src/data/content.test.ts`. Expected: missing visible-label coverage or unmigrated content fails.

- [ ] **Step 3: Convert sections to explicit typed props**

Each section accepts only the content it renders plus a small `labels` object. Remove direct imports of English-only data from presentation components. Do not call locale hooks in static visual components.

- [ ] **Step 4: Localize project-card and external-link labels**

Pass localized strings for live product, case study, private project, selected-project heading, new-tab accessibility suffix, and cover alt text. Keep technology names unchanged.

- [ ] **Step 5: Verify GREEN and commit only task files**

Run focused tests, typecheck, and lint. Expected: all pass without warnings. Commit message: `feat: localize portfolio homepage`.

## Task 6: Localize Case Studies and Archive

**Files:**
- Create: `client/src/app/[locale]/work/[slug]/page.tsx`
- Create: `client/src/app/[locale]/work/archive/page.tsx`
- Remove: `client/src/app/work/[slug]/page.tsx`
- Remove: `client/src/app/work/archive/page.tsx`
- Modify: `client/src/components/work/CaseStudy.tsx`
- Modify: `client/src/components/work/ArchiveCard.tsx`
- Remove: `client/src/app/work/metadata.test.ts`
- Create: `client/src/app/localized-metadata.test.ts`

- [ ] **Step 1: Write failing localized route-metadata tests**

Assert English and Indonesian archive metadata, each locale's Satellyte metadata, localized canonical URLs, `en`/`id` language alternates, Open Graph locale, and the shared social image.

- [ ] **Step 2: Run the metadata test and confirm RED**

Run `rtk pnpm test src/app/localized-metadata.test.ts`. Expected failure: localized route modules do not exist.

- [ ] **Step 3: Implement localized static params and case-study route**

Generate the Cartesian product of two locales and five slugs. Validate locale and slug before rendering. Use localized project content and localized section headings. Preserve sanitized privacy rules and related-work navigation.

- [ ] **Step 4: Implement localized archive route**

Render localized archive heading, introduction, card descriptions, context labels, repository actions, back link, and metadata. Generate both locales statically.

- [ ] **Step 5: Verify GREEN and commit only task files**

Run metadata tests, content tests, typecheck, and lint. Expected: all pass. Commit message: `feat: localize work and archive routes`.

## Task 7: Localized SEO, Sitemap, and Structured Data

**Files:**
- Modify: `client/src/app/[locale]/layout.tsx`
- Modify: `client/src/app/sitemap.ts`
- Create: `client/src/app/sitemap.test.ts`
- Modify: `client/src/app/robots.ts`
- Modify: `client/src/app/opengraph-image.tsx`

- [ ] **Step 1: Write failing sitemap assertions**

Assert 14 document entries: two homepages, ten selected-project routes, and two archive routes. Every logical page must include English and Indonesian alternates with absolute URLs based on `SITE.url`.

- [ ] **Step 2: Run sitemap tests and confirm RED**

Run `rtk pnpm test src/app/sitemap.test.ts`. Expected failure: sitemap only includes English URLs.

- [ ] **Step 3: Implement localized root metadata and JSON-LD**

Generate metadata per locale with localized description, canonical, language alternates, and `en_US`/`id_ID` Open Graph locales. Keep name, profile URLs, education institutions, and skill facts invariant. Localize job title and description fields.

- [ ] **Step 4: Generate localized sitemap entries**

Use the pure locale helpers rather than manually concatenating prefixes. Preserve root robots behavior and locale-neutral Open Graph identity artwork.

- [ ] **Step 5: Verify GREEN and commit only task files**

Run sitemap and metadata tests plus typecheck. Expected: all pass. Commit message: `feat: add localized portfolio seo`.

## Task 8: Route Smoke Tests and Final Verification

**Files:**
- Modify: `client/scripts/test-routes.mjs`
- Modify: `client/README.md`

- [ ] **Step 1: Extend route smoke expectations**

Check direct 200 responses and localized text for `/`, `/id`, both archives, and all ten locale/project combinations. Check `/en` redirects to `/`, unknown locales/projects return 404, both locale variants emit correct canonical and alternate links, `/icon.svg` and the resume remain reachable, and sitemap contains all localized URLs.

- [ ] **Step 2: Run route smoke test and confirm RED**

Run `rtk env NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 pnpm test:routes`. Expected failure before smoke-test migration or from missing locale assertions.

- [ ] **Step 3: Document localization maintenance**

Add exact instructions for adding or editing keys in the three message domains, running parity tests, adding a locale, and setting `NEXT_PUBLIC_SITE_URL` for production builds.

- [ ] **Step 4: Run complete verification**

Run:

```bash
rtk pnpm test
rtk pnpm lint
rtk pnpm typecheck
rtk env NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm build
rtk env NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 pnpm test:routes
```

Expected: 0 failed tests, 0 lint warnings/errors, 0 type errors, successful static generation for both locales, and all route smoke checks pass.

- [ ] **Step 5: Audit the final diff and commit task files**

Confirm no unrelated worktree files are staged, no English-only user-facing copy remains outside approved locale-neutral files, and no unsupported locale can reach a dynamic import. Commit message: `test: verify bilingual portfolio routes`.

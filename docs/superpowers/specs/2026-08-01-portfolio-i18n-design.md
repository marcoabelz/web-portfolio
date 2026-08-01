# Portfolio Internationalization Design

**Date:** 2026-08-01

**Status:** Approved for implementation planning

## Summary

Add complete English and Indonesian support to the existing Next.js 14 portfolio. English remains the default language on the current unprefixed URLs, while Indonesian uses the `/id` prefix. The implementation uses `next-intl` 3.26.5, the latest v3 release whose peer dependencies explicitly support Next.js 14 and React 18.

The complete public site is localized: homepage sections, selected-project case studies, archive, navigation, shared actions, metadata, structured data, sitemap alternates, accessibility labels, and error-facing route behavior.

## Goals

- Preserve all existing English URLs and their search authority.
- Add equivalent Indonesian routes under `/id`.
- Keep static content server-rendered and statically generated.
- Maintain one source of truth for locale-independent facts.
- Keep translated copy typed, organized by domain, and easy to audit.
- Preserve theme behavior, scroll reveal, smooth anchor navigation, scroll-to-top behavior, accessibility, and responsive layout.
- Expose correct canonical and alternate-language metadata for every localized page.

## Non-Goals

- No automatic or runtime machine translation.
- No translation management service or CMS.
- No locale-specific project slugs.
- No framework upgrade beyond the existing Next.js 14 and React 18 versions.
- No localization of technology names, company names, URLs, email addresses, or numeric facts.
- No unrelated visual redesign or navigation-scroll bug fix.

## Locale and URL Policy

Supported locales are `en` and `id`.

- Default locale: `en`.
- Locale prefix policy: `as-needed`.
- English homepage: `/`.
- English work routes: `/work/[slug]` and `/work/archive`.
- Indonesian homepage: `/id`.
- Indonesian work routes: `/id/work/[slug]` and `/id/work/archive`.
- Explicit `/en/...` requests redirect to their unprefixed English equivalent.
- Unsupported locale-like prefixes and unknown project slugs return 404.

The middleware detects locale only when no explicit locale preference is present. The language switcher stores the visitor's explicit choice through the locale cookie handled by `next-intl`. Explicit URLs always win over browser-language detection.

## Architecture

### Routing

Localized pages move below `client/src/app/[locale]/`:

- `[locale]/layout.tsx`
- `[locale]/page.tsx`
- `[locale]/work/[slug]/page.tsx`
- `[locale]/work/archive/page.tsx`

Root special files remain unprefixed where appropriate:

- `favicon.ico` and `icon.svg`
- `robots.ts`
- `sitemap.ts`
- `opengraph-image.tsx`

`client/src/middleware.ts` applies locale routing only to document routes and excludes Next.js assets, public files, and metadata endpoints.

### Internationalization Modules

- `client/src/i18n/routing.ts` defines supported locales, the default locale, and prefix policy.
- `client/src/i18n/request.ts` validates the requested locale and loads its messages.
- `client/src/i18n/navigation.ts` exports locale-aware `Link`, pathname, and router helpers.
- `client/src/i18n/locale.ts` contains small pure helpers for validation, localized paths, canonical URLs, and alternate URLs.
- `client/messages/en/` and `client/messages/id/` contain domain-scoped messages.

The Next.js config is wrapped with the `next-intl` plugin. The dependency is pinned to `next-intl@3.26.5` for compatibility with the current framework.

## Content Model

Locale-independent facts stay in typed TypeScript data:

- names and company names;
- project slugs and privacy state;
- technology stacks;
- public URLs, repository URLs, images, and resume path;
- machine-readable dates;
- verified numeric facts.

Localized copy is separated into three message domains per locale:

1. `common` — navigation, buttons, accessibility labels, privacy labels, section labels, footer, and language names.
2. `portfolio` — profile introduction, availability, experience summaries and highlights, about copy, education display text, and language proficiency text.
3. `projects` — project descriptors, outcomes, highlights, image alternative text, archive descriptions, and every case-study section.

Message files are merged by the request loader. English messages become the structural reference type for Indonesian messages, so missing or misspelled keys fail TypeScript validation. Tests additionally compare project keys and list lengths across locales.

Content getters accept a validated locale and return the same existing portfolio contracts. Presentation components consume localized content through these getters rather than importing English-only constants directly. This keeps components readable and avoids locale conditionals inside JSX.

## Rendering and Data Flow

1. Middleware resolves the URL locale and normalizes the prefix.
2. The locale layout validates `params.locale`, sets the request locale, loads messages, and sets `<html lang>`.
3. Server page components retrieve localized content for the validated locale.
4. Shared presentation components receive already-localized data and labels.
5. Client components receive only the minimum strings and locale-aware URLs they need.

All locale and project combinations are returned from `generateStaticParams`, preserving static generation. Unknown locales and slugs call `notFound()`.

## Language Switcher

The header gains a compact `EN / ID` control adjacent to the theme toggle.

- It preserves the current page and project slug.
- On the homepage, it also preserves the current hash section when practical.
- The active language uses text and `aria-current`, not color alone.
- The control remains usable in desktop and mobile navigation.
- Switching language closes the mobile menu without introducing another global scroll listener.

English is displayed as `EN` and Indonesian as `ID`; accessible labels use the full language names.

## Metadata and SEO

Root and work-page metadata are generated per locale:

- localized title and description;
- locale-specific canonical URL;
- `alternates.languages` entries for `en` and `id`;
- localized Open Graph and Twitter text;
- Open Graph locale values `en_US` and `id_ID`;
- localized `Person` structured-data fields where appropriate.

The sitemap includes every English and Indonesian route and supplies language alternates. Project slugs remain identical across languages. `robots.txt` continues to point at the one root sitemap.

## Accessibility and Failure Behavior

- `<html lang>` always matches the resolved locale.
- Switcher controls have explicit accessible names and active-state semantics.
- Skip-link, mobile-menu, theme-toggle, scroll-to-top, external-link, and private-project labels are localized.
- Reduced-motion behavior remains unchanged.
- Message loading is restricted to the two known locales; arbitrary user input cannot become an import path.
- Missing content keys fail tests/build rather than falling back silently to a different language.

## Testing and Verification

Automated tests cover:

- locale validation and localized-path helpers;
- English and Indonesian message-shape parity;
- complete localized profile, experience, selected-project, archive, and case-study content;
- invariant slugs, project counts, dates, URLs, and stack data;
- locale-specific metadata, canonical URLs, and language alternates;
- sitemap coverage for every localized route;
- static params for both locales and every selected project;
- accessible language-switcher markup;
- direct route smoke tests for `/`, `/id`, English and Indonesian case studies, both archives, assets, sitemap, robots, and 404 routes.

Final verification runs the full unit suite, lint, typecheck, production build with a valid `NEXT_PUBLIC_SITE_URL`, and route smoke tests.

## Migration Strategy

The migration is incremental and preserves behavior:

1. Add locale helpers, messages, parity tests, and compatible `next-intl` configuration.
2. Separate invariant data from localized content behind typed getters.
3. Move routes under `[locale]` while preserving unprefixed English URLs through middleware.
4. Localize shared components and add the language switcher.
5. Localize metadata, sitemap, structured data, and route tests.
6. Run regression and production verification.

Existing unrelated worktree changes are preserved. Files are moved or edited only when required by the locale architecture.

# Portfolio Refresh Design

**Date:** 2026-07-22

**Status:** Approved

## Summary

Refresh Marco Abel Zefanya's existing Next.js portfolio into a production-engineering portfolio that presents current experience, selected commercial work, and technical depth without discarding the site's established blue identity or profile photo.

The implementation will use an incremental refactor. It will keep Next.js 14, React 18, TypeScript, Tailwind CSS, and the App Router while replacing the outdated content model and oversized client-rendered project gallery with typed content, reusable components, static case-study routes, responsive light/dark themes, and server-first rendering.

## Goals

- Position Marco as a Full-Stack Engineer focused on backend systems, AI products, computer vision, automation, and production infrastructure.
- Put five production and commercial case studies ahead of education and older bootcamp work.
- Present all four professional roles with accurate titles and dates.
- Make content DRY, typed, reusable, and easy to update.
- Improve accessibility, SEO, loading performance, responsive behavior, and maintainability.
- Provide a polished light and dark mode with restrained motion.
- Keep private-project information sanitized and avoid fabricated links or outcomes.

## Non-Goals

- No framework rewrite or broad dependency upgrade.
- No backend, CMS, contact-form API, analytics platform, or database.
- No invented metrics, testimonials, repositories, or internal screenshots.
- No publication of customer data, internal endpoints, scoring logic, credentials, or safety thresholds.
- No commit, push, pull request, or deployment.

## Source-of-Truth Priority

1. `client/portfolio-vercel-update-plan.md` and the current CV provide the canonical titles, dates, education, and professional positioning.
2. The supplied LinkedIn screenshots provide sanitized supporting detail for responsibilities and product context.
3. Existing website data supplies valid archive-project content and reusable public assets.

The main public title remains `Full-Stack Engineer`. The GTM context from LinkedIn belongs in the Satellyte case study rather than the primary title.

## Approved Product Direction

The chosen visual direction is **Editorial Product Engineer**:

- Strong hero positioning with a clear role and specialty.
- Satellyte appears as the flagship case study.
- Four supporting production projects remain visible but visually quieter.
- Experience and technical depth follow the selected work.
- Layout uses intentional whitespace and typography instead of filling every area with cards.

The design must not look like a generic AI-generated landing page. Specifically, it will avoid excessive gradients, glassmorphism, glowing decorations, emoji icons, repeated pill-shaped elements, uniform card grids, gimmicky copy, and animation on every element. Blue remains the accent color, supported by neutral slate surfaces and editorial typography.

## Information Architecture

Homepage order:

1. Sticky navigation
2. Hero
3. Selected Work
4. Professional Experience
5. About
6. Technical Skills
7. Education and Languages
8. Contact
9. Footer

Routes:

- `/` — editorial homepage
- `/work/satellyte`
- `/work/palmgrade`
- `/work/ai-recruitment-platform`
- `/work/internal-erp-platform`
- `/work/factory-monitoring-system`
- `/work/archive` — older and secondary work
- `/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf` — public resume asset

Navigation labels are `Work`, `Experience`, `About`, `Skills`, `Contact`, and `Resume`. The Resume action receives distinct visual treatment.

## Application Architecture

Static portfolio content will be rendered through Server Components. Client Components are limited to behavior that requires browser state:

- responsive mobile navigation;
- theme selection and persistence.

The homepage itself remains a Server Component. It composes focused section components from typed data and contains no global scroll listener. Static case-study pages use a shared layout and `generateStaticParams`; unknown slugs return `notFound()`.

### Planned File Responsibilities

- `client/src/types/portfolio.ts` — shared portfolio content contracts.
- `client/src/data/portfolio.ts` — profile, navigation, experience, education, languages, skills, contact, and social data.
- `client/src/data/projects.ts` — selected work and archive project data.
- `client/src/lib/site.ts` — canonical site URL and shared metadata values.
- `client/src/components/ui/` — small reusable presentation primitives.
- `client/src/components/layout/` — header, mobile navigation, theme control, and footer.
- `client/src/components/sections/` — homepage sections with one responsibility each.
- `client/src/components/work/` — project cards, case-study sections, and related-work navigation.
- `client/src/app/work/[slug]/page.tsx` — statically generated case-study route.
- `client/src/app/work/archive/page.tsx` — archive route.
- `client/src/app/robots.ts` and `client/src/app/sitemap.ts` — search-engine endpoints.

Components share centralized section headings, links/buttons, tags, social links, and work cards. Content strings are not duplicated between desktop and mobile navigation or between homepage cards and case-study pages.

## Content Model

Typed data models cover:

- navigation entries;
- social links;
- professional experiences;
- education and languages;
- skill groups;
- selected and archived projects;
- project context, role, summary, highlights, stack, privacy state, cover, actions, and case-study sections.

All selected projects require a unique slug, descriptive cover alternative text, context label, role, one-sentence outcome, three concise homepage highlights, and five to eight technology tags. Link states are explicit: public product, public repository, or private project. A missing repository never becomes a disabled or fake link.

## Selected Work

| Slug | Project | Presentation | Primary action |
| --- | --- | --- | --- |
| `satellyte` | Satellyte — AI Sales Intelligence Platform | Flagship branded cover | Live Product and Case Study |
| `palmgrade` | Palmgrade — Industrial Computer Vision System | Sanitized abstract cover | Private Project and Case Study |
| `ai-recruitment-platform` | AI Recruitment Platform | Sanitized abstract cover | Private Project and Case Study |
| `internal-erp-platform` | Internal ERP Platform | Existing representative screenshot | Private Project and Case Study |
| `factory-monitoring-system` | Factory Monitoring System | Sanitized abstract cover | Private Project and Case Study |

Each case study uses the same reusable structure:

1. Overview
2. Problem
3. Role and responsibilities
4. What was built
5. Key technical decisions
6. Reliability or operational constraints
7. Verifiable outcome
8. Technology stack
9. Sanitized visual or branded cover

No numeric outcome appears unless it is already verified in the CV, approved plan, or supplied LinkedIn content. Approved facts such as three production systems, three camera feeds, three production lines, 10+ signal strategies, and required 100% QA coverage may be used in their proper context.

## Project Archive

The archive keeps valid historical work accessible without placing it in the primary homepage narrative. It includes Nutrical, Zamasto, M Event, Xiaopee, Instaclone, Chatting App, and Omahucok.

Archive cards show one optimized thumbnail, a concise description, technology labels, and only verified links. Nutrical and Zamasto are labeled as secondary commercial work. The mismatched Chatting App repository is removed because no correct repository exists in the current project data.

## Visual System

### Light Theme

- Warm white and pale slate page surfaces.
- Dark slate text.
- Controlled blue accents and restrained shadows.
- Solid or subtly tinted surfaces instead of pervasive glass effects.

### Dark Theme

- Deep navy page surfaces rather than pure black.
- Cool off-white primary text and muted slate secondary text.
- Electric blue used sparingly for focus and action states.
- Separate dark-mode surface, border, shadow, and code-block tokens.

The initial theme follows `prefers-color-scheme`. A manual toggle persists the visitor's selection in local storage. A small pre-render theme script prevents a flash of the incorrect theme. Both themes meet reasonable contrast expectations and expose visible keyboard focus.

### Motion

- CSS transitions are preferred over a runtime animation library.
- Hero, section reveal, card hover, and mobile-menu transitions use approximately 180–260 ms durations.
- Elements do not wait through long stagger sequences after anchor navigation.
- `prefers-reduced-motion: reduce` disables nonessential motion and smooth scrolling.

## Responsive Design

The layout is mobile-first and explicitly checked at 320 px, 375 px, 768 px, 1024 px, 1440 px, and a wide desktop width.

- Hero content stacks on mobile and becomes an asymmetric editorial layout on larger screens.
- Primary actions wrap without clipping.
- Project cards shift from one column to an asymmetric featured grid.
- Experience remains readable as a single timeline rather than compressed multi-column cards.
- Navigation becomes an accessible disclosure menu on smaller screens.
- Long technology names, email addresses, and project titles wrap safely.
- Media always reserves dimensions to prevent layout shift.

## Performance Design

- Use Server Components for static content and keep client boundaries narrow.
- Remove the homepage-level scroll listener and large interactive screenshot gallery.
- Use `next/image` with explicit dimensions and responsive `sizes`.
- Prioritize only the hero profile image; lazy-load below-the-fold images.
- Use a single representative cover per homepage or archive card.
- Use CSS-created or lightweight SVG abstract covers for private projects.
- Load fonts only through `next/font`; remove the duplicate Google Fonts CSS import.
- Avoid a runtime animation package and additional UI framework.
- Generate case-study pages statically.

The active package manager is pnpm because the most recent dependency-lock maintenance targeted `pnpm-lock.yaml`. The stale `package-lock.json` will be removed during implementation so installs remain deterministic.

## Accessibility

- Exactly one page-level `h1` on each route.
- Semantic `header`, `nav`, `main`, `section`, `article`, and `footer` landmarks.
- `h2` section headings and `h3` project/company headings.
- Skip-to-content link and visible focus styles.
- Descriptive image alternative text; decorative imagery uses empty alternative text.
- Accessible names for icon-only controls and social links.
- Correct `aria-expanded` and `aria-controls` on mobile navigation.
- Keyboard-operable theme toggle and menu.
- State is communicated by text or icon as well as color.
- Reduced-motion preferences are honored.

## SEO and Metadata

- Title: `Marco Abel Zefanya | Full-Stack Engineer`
- Description: `Full-Stack Engineer specializing in backend systems, AI-powered products, computer vision, browser automation, and production infrastructure.`
- Canonical origin comes from `NEXT_PUBLIC_SITE_URL`, with a documented development fallback.
- Root metadata includes Open Graph and Twitter/X fields.
- Each case study receives project-specific title, description, and canonical URL.
- The site includes an Open Graph asset, favicon/application icons, `robots.txt`, `sitemap.xml`, and Person JSON-LD.
- Metadata never retains create-next-app defaults.

## Error and Fallback Behavior

- Invalid case-study slugs return the framework 404 page.
- Content validation fails tests when slugs collide, required fields are empty, or placeholder links are introduced.
- Private work renders explicit non-interactive `Private project` text.
- Abstract project covers are local assets with known dimensions, so they do not depend on external image hosts.
- Site URL configuration has a safe local-development fallback and is documented for production.

## Verification Strategy

Automated checks cover content invariants:

- exactly five selected projects;
- unique project slugs;
- required cover and alternative text;
- valid internal or HTTP(S) actions;
- no `href="-"` or mismatched repository placeholder;
- all navigation anchors target homepage section IDs;
- correct current experience dates and titles.

Implementation validation runs:

- pnpm lint;
- TypeScript with `tsc --noEmit`;
- the new content-invariant test suite;
- production build;
- local production preview and browser smoke checks.

Browser checks cover the homepage, five case studies, archive, 404 behavior, theme persistence, system theme, reduced motion, mobile navigation, keyboard focus, anchor offsets, resume download, external links, metadata, console errors, horizontal overflow, and desktop/mobile screenshots.

Repository searches confirm that outdated roles, dates, generic image alternatives, create-next-app metadata, `href="-"`, and the hard-coded 2025 footer are gone.

## Completion Boundary

Implementation is complete when the approved content, routes, themes, responsive behavior, accessibility, SEO, and verification checks are present and pass locally. The work stops before commit, push, pull request creation, or deployment.

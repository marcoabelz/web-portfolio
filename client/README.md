# Marco Abel Zefanya — Portfolio

An editorial, server-first engineering portfolio built to present verified work clearly. The interface is responsive, accessible, and supports light and dark themes while keeping client-side JavaScript focused on interaction.

## Stack

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS
- Lucide React icons and `simple-icons` (technology logos)
- Zod (content validation)
- Inter Tight, Inter, and JetBrains Mono via `next/font`
- Vitest

## Local development

Use Node.js 24 and pnpm 10.28.0 (both declared in `package.json`; `engines.node` is `24.x` because Vercel no longer builds on Node 20).

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Available project commands:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm check
NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm build
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 pnpm test:routes
pnpm start
```

`pnpm check` runs lint, TypeScript, and the Vitest suite. `pnpm test:routes` builds the production app with a matching local canonical origin, starts it on an available loopback port, checks every public route and asset, and stops the server. Run `pnpm build` before a manual `pnpm start`.

## Environment

Production builds require `NEXT_PUBLIC_SITE_URL` to be a valid canonical HTTP(S) URL, for example `https://portfolio.example.com`. The app normalizes any path, query, or hash to that URL's origin; a production build fails with a clear error if the value is missing or malformed. Development and tests fall back to `http://localhost:3000`.

## Page structure

The homepage is a Hero and a Bento block, then numbered sections driven by `content/site.json` `sections` (order and visibility). In the default order they are: apps, about, services, experience, stack, testimonials, lab, contact.

`src/components/sections/registry.ts` `resolveHomeSections` drops any section that is hidden or has no entries and numbers the rest without gaps ("01, 02, 04" cannot happen). Testimonials ships empty, so it is hidden until a real entry is added. The navigation (`NAV_SECTION_IDS`: apps, about, services, experience, contact) is derived from the same result, so a hidden section disappears from the page, the nav, and the numbering together. `src/data/home.ts` builds the per-section models.

Each Experience row is a disclosure: the heading is a button (`aria-expanded`, `aria-controls`) that opens a panel with a "Highlights" list and a "Stack" group of technology chips. `ExperienceRow.tsx` is the section's only client island and receives plain data, so the icon lookup stays on the server. The group labels come from `common.json` (`highlightsLabel` and its stack counterpart).

Anchors are `#apps`, `#about`, `#services`, `#experience`, `#stack`, `#testimonials`, `#lab`, `#contact`. Slugs in `content/projects.json` are the URLs of the case studies; treat them as immutable once created.

## Typography and tokens

Fonts load through `next/font` and are exposed as CSS variables: `--font-display` (Inter Tight), `--font-sans` (Inter), `--font-mono` (JetBrains Mono, labels). Layout tokens `--gutter` and `--page-max` live in `globals.css`; `--ok` (green) is used only for the availability dot. Every animation honours `prefers-reduced-motion`, including the experience panel's delayed `visibility` change.

## Technology logos

Logos come from `simple-icons`, resolved on the server in `src/lib/icons.ts` (`import "server-only"`; Vitest aliases `server-only` to a stub). A skill with no logo, or a slug that a package upgrade removed, falls back to a monogram: `skillIcons` in `content/portfolio.json` maps skills to slugs, and, when no `monogram` is set, `defaultMonogram()` in `src/lib/monogram.ts` (re-exported by `src/lib/icons.ts`, and shared with the editor's icon preview) derives the fallback. There are no files under `public/skills`.

Logos are drawn from a shared sprite, not inlined. A brand `TechIcon` carries only its `slug` and `title`; `TechChip` renders `<svg fill="currentColor"><use href="/icons.svg#si-{slug}"/></svg>`. The sprite is the static route `src/app/icons.svg/route.ts` (`force-static`, `image/svg+xml`, one `<symbol id="si-{slug}">` per slug in `skillIcons`, built by `buildIconSprite`). Inlining every path repeated each logo once per chip and made the homepage HTML nearly three times larger (434 kB raw, 99 kB gzipped, against 158 kB and 23 kB now). The sprite is same-origin, which is what lets `<use>` inherit `currentColor` from the chip; the `.` in its URL keeps it out of the locale middleware, and `middleware.test.ts` pins that. The URL carries a version, `/icons.svg?v=<hash>` (`iconSpriteUrl` in `src/lib/icons-sprite.ts`): `next.config.mjs` hashes the `skillIcons` slugs into `NEXT_PUBLIC_ICON_SPRITE_VERSION`, so a browser holding an old sprite fetches a new one as soon as a slug is added. Add a slug to `skillIcons` and it appears in the sprite on the next build.

## Loading states

Anything that loads shows a skeleton until it is ready: `SkeletonImage` (images, with an error state), `loading.tsx` for `/work/[slug]` and `/work/archive`, and a skeleton bubble in the chat while a reply is pending. New images and route segments should follow the same rule.

## Performance budget

Every public page is statically generated. Homepage First Load JS may grow at most 10 kB over the pre-redesign baseline (101 kB), Lighthouse mobile performance must stay at 95 or above, and CLS at 0.05 or below. Check with `pnpm build` and, for Lighthouse, `pnpm start` plus `npx -y lighthouse@12 http://localhost:3000/ --only-categories=performance --form-factor=mobile --chrome-flags="--headless=new"`.

## AI chat widget

The floating chat widget answers visitor questions using only the data from `src/data/portfolio.ts` and `src/data/projects.ts`, which join `content/*.json` with the message copy. It has no other knowledge and declines everything off-topic.

Setup:

1. Create an API key at https://aistudio.google.com/apikey (free tier, no billing required).
2. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY`.
3. Restart the dev server.

Without `GEMINI_API_KEY` the widget does not render at all and `/api/chat` returns 503 — the feature fails closed rather than half-working.

Deploying: add `GEMINI_API_KEY` as an environment variable in the hosting dashboard (Vercel → Project → Settings → Environment Variables) for every environment that should have the chat. Never prefix it with `NEXT_PUBLIC_`; that would publish the key to every visitor.

Window: on desktop the chat window is 480px wide (`30rem`, capped to the viewport) and up to 45rem tall. On a phone it is a near full-screen sheet sized from `window.visualViewport`, not `100dvh`, because `dvh` does not shrink when the on-screen keyboard opens and would leave the input underneath it; `chat-size.test.ts` guards this.

Focus: on desktop, opening the chat focuses the input. On a phone it focuses the sheet's close button instead, so focus moves into the dialog without raising the on-screen keyboard before the visitor has read anything. Only the phone sheet is `aria-modal`, and while it is, Tab and Shift+Tab cycle inside it (`trapTarget` in `src/components/chat/focus-trap.ts`). Phone or desktop is re-read whenever the `(max-width: 767px)` media query changes, so rotating a tablet across the breakpoint switches the sheet sizing, the scroll lock, and the modal behaviour without reopening the panel; `focus-trap.test.ts` pins this.

Limits: 1000 characters per message, 20 messages of history, 5 messages per minute per IP, 20 messages per page load, 500 output tokens per reply.

Abuse handling, in `src/lib/chat/`:

- `validate.ts` rejects malformed bodies before anything reaches the model. It caps message length and history size but not the raw body — App Router handlers have no body-size limit of their own, so the effective ceiling is whatever the host enforces (4.5 MB on Vercel). Self-hosting behind your own proxy means setting that limit there.
- `rate-limit.ts` is a per-process in-memory limiter with a hard ceiling of 50,000 tracked keys. It fails closed at capacity rather than evicting, so a spoofed-IP flood cannot buy itself a fresh quota. It resets on cold start; move it to a shared store if one process stops being the whole app.
- `route.ts` rejects requests whose `Sec-Fetch-Site` header says they came from another origin. That is quota control, not authentication — it stops a drive-by page elsewhere from spending the key through its own visitors' IPs, which per-IP limiting cannot see.
- `prompt.ts` wraps visitor text in `<user_message>` delimiters and strips those tags from the input first, repeating until the string stops changing — a single pass would let `<use</user_message>r_message>` reassemble into a live tag.
- `route.ts` sanitises conversation history too. History arrives in the request body, so a forged `model` turn could otherwise fabricate an assistant concession.

An empty chat offers three suggested questions (`components/chat/suggestions.ts`) as pills under the greeting. A click goes through the same `submit` as the input, so the blank, in-flight, session-cap, and server validation guards apply unchanged; the pills vanish after the first message.

Known limitation: the widget's own interface copy (button labels, greeting, placeholder, suggested questions) is English on both locales. Replies still follow the visitor's language because the system instruction asks for it, but the chrome is not yet wired into the message catalogs.

## Content editor

`/admin` edits the site content in the browser and commits the result, so changing copy needs neither an editor nor a manual deploy: save, and the host rebuilds the site from the new commit in about a minute. Git is the storage — there is no database.

Setup:

1. Create a fine-grained personal access token at https://github.com/settings/personal-access-tokens, with repository access limited to this repository and one permission: `Contents: read and write`.
2. Fill in `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (`openssl rand -base64 32`), `GITHUB_TOKEN`, and `GITHUB_REPO` (`owner/repo`) in `.env.local`. `GITHUB_BRANCH` is optional and defaults to `main`.
3. Deploying: add the same variables in the hosting dashboard (Vercel → Project → Settings → Environment Variables). They take effect on the next deployment. Never prefix any of them with `NEXT_PUBLIC_`.

Without all five the editor fails closed like the chat widget: `/admin` is a 404 rather than a login box that could never succeed. `src/middleware.ts` skips `/admin` so it is never localized, and `robots.ts` disallows it.

What it manages: everything on the site that is content, in one place.

- Facts in `content/site.json` (name, role, location, social links, CV path, section order and visibility), `content/portfolio.json` (experience dates and stack, skills and their logos, education, languages) and `content/projects.json` (apps, covers, privacy, screenshots, archive, lab).
- Message copy in `messages/{en,id}/{common,portfolio,projects}.json`, both languages side by side.
- Collections: apps, archive, experience, services, skill groups, testimonials, lab and the other lists whose entries can be added, moved, and removed. Their item shapes live in `COLLECTIONS` (`src/lib/content/collections.ts`), which both the server validator and the editor read, so the two cannot disagree about what an entry looks like.
- Images (covers, portrait, screenshots) and the CV PDF, and section order and visibility.

The schema is one file, `src/lib/admin/schema.ts`: sections of typed fields, each mapped to a content fact or a message key. A key or fact that no field mentions is not hidden: it appears under "Other" (rendered by `Fields.tsx`) until it is mapped to a field. `schema.test.ts` also fails when a field points at a path that no longer exists (`danglingFieldPaths`), except a field guarded by `showWhen` while no entry has that kind: with no repo Lab entry left, the repository name, URL, stack, and description fields have nothing to point at, and that is not an error. A field marked `optional` (the archive repository URL) is skipped the same way when no entry sets it. Field types: text and paragraph (with a soft length limit), fact (text, URL, or email), month, select, toggle, tags, image, resume, icon, text list, copy list, collection, and sections.

Uploads: JPEG, PNG, WebP, and AVIF go in; a phone photo is shrunk in the browser (`prepareImage`) to at most 2400px on the long edge and re-encoded as WebP, or as JPEG when the browser cannot encode WebP (Safari and every iOS browser). The result must be 4 MB or less (`4 * 1024 * 1024` bytes), is stored as `client/public/media/YYYY/<name>-<hash>.webp` (or `.jpg`), and is never SVG, because SVG served from this origin can run script. A format the browser cannot decode, such as HEIC, is refused with "Export the photo as JPEG or PNG first" and nothing is sent. The CV is the one PDF allowed and is always written to the fixed path in `site.json`. `checkUpload` re-checks the bytes on the server, not only the declared type. An upload alone never commits: `uploadMedia` creates a loose blob on GitHub and the draft carries it as a pending upload; it joins the repository only when a publish references it, so abandoned uploads never touch the branch.

One publish is one commit, and so one deploy. Commits touch only `client/content/*.json`, `client/messages/{en,id}/*.json`, `client/public/media/**`, and the CV path.

If the branch moved after the editor loaded (a code push, or another editor tab), publishing fails with the conflict message, overwrites nothing, and keeps the draft: reload, restore the draft, and publish again. A signed-out session and a failed save also keep the draft in local storage. A stored draft is offered on the next load; edits made while that offer is open go to a second backup key so the offered copy is not overwritten. A successful publish clears both backup keys and closes any open offer, so a later load cannot offer a snapshot that would undo the publish. Only a stored draft whose content passes `parseContentFiles` and whose messages have every domain in both locales is offered.

Restoring after the site moved (the conflict case above) rebases instead of replacing: each backup stores the base draft it was made on, and `rebaseDraft` (`src/app/admin/editor/rebase.ts`) re-applies only the backup's own per-leaf changes (facts, both locales' copy, and the pending uploads still referenced) onto the newly loaded base. Collection entries merge by id, so an entry added or moved on the site does not shift the edits. Upstream changes the backup did not touch, including new message keys, survive. A leaf changed on both sides keeps the backup's value and is listed in the restore prompt as a conflict. A backup saved before bases were stored restores the whole snapshot as before, with the "site changed" warning.

`checkDraft` is the trust boundary: the browser is never trusted, so every publish re-runs all validation on the server, whatever the editor already checked.

Manual check before relying on the editor (not part of CI, because it needs real credentials and writes commits). The editor reads `GITHUB_BRANCH` (default `main`); point it at a throwaway branch, and note that `client/content/*.json` exists only on `feat/editorial-redesign` until it is merged, so `main` must have this branch merged before the editor can load there. With `pnpm dev` and the admin variables in `.env.local`:

1. Edit the hero intro in both languages and publish: one commit, `content: update hero`, touching only the two `portfolio.json` files.
2. Add a testimonial (name, company, quote, role in both languages) and publish: `pnpm build` passes and `/` shows Testimonials numbered in place.
3. Replace the portrait with a phone JPEG over 4 MB: the preview appears, the review lists the upload, and the commit contains `client/public/media/YYYY/...` and the updated `site.json`.
4. Try a HEIC file: the plain "Export the photo as JPEG or PNG first" message appears and no request is sent.
5. Hide Services and move Lab above Stack, publish, and rebuild: the navigation has no Services link and the numbering has no gap.
6. First set a repository URL on an archive project (none has one now), point a Lab entry at it, then remove that project from the Archive: the review blocks publishing and names the Lab issue.
7. Start an edit, push any commit to the branch from a terminal, then publish: the conflict message appears; reload, restore the draft, and publish succeeds.
8. Close the tab mid-edit and reopen `/admin`: the restore prompt appears.

How it loads and saves:

- One draft is the three content files (`content/{site,portfolio,projects}.json`), the six message files, and a list of pending uploads (`ContentDraft` in `src/lib/admin/draft.ts`). `readDraft` in `src/lib/admin/github.ts` reads the branch head once and then every file at that commit, so the nine files come from one moment; the head sha is the `baseSha` the editor carries.
- `checkDraft(candidate, reference, publicFiles)` re-runs every rule the build runs (`parseContentFiles`, `checkContentReferences`, `checkCatalogParity`, which also cover copy-entry shape, duplicate ids, and a public app with screenshots needing a live URL), pins message keys to the repository's files except inside the `COLLECTIONS` containers (those are keyed by entry id), requires every referenced image or the CV to exist on the branch or be a pending upload, confines pending uploads to `client/public/media/**` (`.webp` or `.jpg`) or the CV path, requires each pending upload's `sha` to be a 40-character lowercase hex git blob id, and pins `site.profile.resumePath` to the repository's value (the CV URL is fixed; the editor only replaces the file behind it). Failures come back as `ContentIssue[]` naming the file and path, and nothing is written.
- `saveDraft(draft, baseSha)` returns `{ ok: true, commitSha, commitUrl }` or `{ ok: false, reason }` with `invalid` (plus the issues), `conflict`, `signed-out`, or `error`. It drops pending uploads the content no longer references and writes only files whose serialized bytes changed. All of it is one GitHub commit (`commitDraft`), so one rebuild.
- `commitDraft` throws `BranchMovedError` when the branch head is no longer `baseSha`, or when GitHub answers the non-forced ref update with 422. The save answers `conflict`, nothing is overwritten, and the editor keeps the draft.
- After a successful publish the reducer adds the published uploads' paths to `publicFiles` and empties `draft.media`, so the media picker offers them and the next publish does not send them again.
- An expired session is an answer (`signed-out`), not an exception, so the draft can be kept in the browser and restored after signing in.
- The screen (`src/app/admin/Editor.tsx` with `src/app/admin/editor/`): a sidebar of the schema's sections (a select under the top bar below 960px), a top bar with search, "View site", "Sign out" and the theme toggle, one section panel at a time, and a pinned save bar ("N changes", "Discard", "Review and publish"). State lives in `editorReducer`; a dot marks sections with unpublished changes; search (`filterFields`) matches labels and current text in both languages. The unpublished draft is backed up to local storage 800 ms after each change and offered back on the next load. The editor shares the site's theme tokens (dark unless light was chosen). Each field is a typed input from `src/app/admin/editor/fields/` (`FieldRenderer` picks it from the schema's `kind`): English and Indonesian side by side from 768px with an "Untranslated" badge, a soft-limit counter, and read-only `{placeholder}` tokens that warn when the languages differ; facts with inline https/email checks; month with "Present"; selects (cover kind, app privacy, and lab source swap the whole shape: going private drops the live URL and keeps screenshots and captions; a lab source switch replaces the entry and its copy); tags with skill suggestions; image and CV replace (images are shrunk in the browser by `prepareImage` inside the editor's upload handler); a Simple Icons search; lists and collections with add, move, and remove (confirmed, because it removes the text in both languages); fixed lists with text only; and the section order/visibility list. Every field shows "Changed" and a "Reset" (copy resets both languages). The "Other" section renders uncovered copy paths through `src/app/admin/Fields.tsx`. "Review and publish" (or Cmd/Ctrl+S) opens a native `<dialog>` (`ReviewDialog`, with `buildReview` in `editor/review.ts`): issues in red first (the same `checkDraft` stages, with "More checks run after these are fixed." when an early stage stopped), then every change by section with both languages labelled and thumbnails for pending uploads, then the commit message. Publish is disabled while publishing and while issues exist; Escape is ignored while publishing. Nothing to publish is decided like `saveDraft` does: no changed file bytes means no commit, and a change no field names shows as "Formatting or unlisted changes" and publishes as `content: update`. Results: published (with a "View commit" link), invalid (dialog stays open), conflict (Reload), signed out (Sign in); the draft is written to local storage immediately on conflict, signed out, and error. A stored draft is offered by `RestorePrompt` ("You have unpublished changes from 5 minutes ago. Restore them?"). While that offer is open, new edits are backed up under a second key (`portfolio-admin-draft-edits`) so the offered draft is never overwritten: Restore replaces the edits made meanwhile, Discard keeps them, and after a reload the newer of the two copies is offered.

Sign-in handling:

- The session is an expiry stamp signed with HMAC and kept in a cookie — no session store to run. It is `httpOnly`, `SameSite=Lax`, scoped to `/admin`, `Secure` in production, and lasts 8 hours.
- Credentials are compared through SHA-256 digests, so the comparison is constant-time and leaks no length, and both comparisons always run.
- Sign-in reuses the chat widget's per-IP limiter, so password guessing is throttled at the same 5 attempts per minute.
- `saveDraft` re-checks the session itself. Server actions are public endpoints; the page having rendered the editor is not proof the caller is signed in.

## Localization maintenance

English is the default locale and keeps unprefixed URLs. Indonesian uses the `/id` prefix. Routing is configured in `src/i18n/routing.ts`; path normalization and language alternates live in `src/i18n/locale.ts`.

Messages are split into three matching domains under `messages/en` and `messages/id`:

- `common.json` contains navigation (`navigation.apps/about/services/experience/contact`), actions, section headings (`sections.*`), labels (including `labels.workMode`), accessibility copy, language names, and footer copy.
- `portfolio.json` contains the profile (`intro.lead/tail`), experience, about, services, stack group titles (`skillGroupTitles`, kebab-case keys), education, language, testimonial, and lab copy.
- `projects.json` contains selected apps, archive apps, and case-study headings.

To add or edit copy, change the same key in both locale files for its domain. Keep stable IDs and invariant facts—names, slugs, dates, URLs, technologies, and asset paths—in `content/*.json` rather than duplicating them in messages. Do not build dynamic import paths from a request locale; register every catalog with static imports in `src/i18n/messages.ts`.

Run the message parity tests after every catalog change:

```bash
pnpm test src/i18n/messages.test.ts
```

The parity suite requires identical nonblank leaf keys and matching interpolation placeholders in English and Indonesian. An empty `{}` is allowed only at the copy containers named in `COLLECTIONS` (for example testimonials, which ships empty). Tests assert rules, not current copy, so an editor publish cannot turn `pnpm check` red. Then run the full validation commands before publishing:

```bash
pnpm test
pnpm lint
pnpm typecheck
NEXT_PUBLIC_SITE_URL=https://your-production-origin.example pnpm build
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 pnpm test:routes
```

`NEXT_PUBLIC_SITE_URL` is required for production builds and must be a valid `http://` or `https://` URL. If it includes a path, query, or hash, the app intentionally normalizes it to its origin. It drives canonical URLs, language alternates, structured data, robots, sitemap, and social metadata. `test:routes` reserves its own loopback port and supplies the matching origin while it builds and starts the production server.

To add another locale:

1. Add its code to `locales` in `src/i18n/routing.ts` and create all three complete catalogs under `messages/<locale>`.
2. Statically import and register those catalogs in `src/i18n/messages.ts`; extend the locale/path helpers and their matrix in `src/i18n/locale.ts` and `src/i18n/locale.test.ts`.
3. Add the language label and option to `common.json` and `src/components/layout/LanguageSwitcher.tsx`, including switcher tests.
4. Extend localized metadata (including the Open Graph locale), sitemap alternates, route smoke manifest, and their tests.
5. Run the parity test, full test suite, lint, typecheck, production build, and route smoke commands above.

## Theme and locale switching

The color theme rides on a `data-theme` attribute on `<html>`, not on a class. A language switch changes the `[locale]` segment, which remounts the locale layout, and React clears the `<html>` attributes it does not own—including `className`. It never touches `data-theme`, so the palette survives the switch. Three places have to agree, and `src/components/layout/ThemeToggle.test.ts` fails if one of them drifts:

- `tailwind.config.ts`: `darkMode: ["selector", '[data-theme="dark"]']`
- `src/app/globals.css`: the dark token block is keyed on `[data-theme="dark"]`
- `src/components/layout/ThemeScript.tsx` (pre-paint, inline) and `ThemeToggle.tsx` both read and write `documentElement.dataset.theme`

`ThemeToggle` also re-applies the stored theme in a layout effect on mount, which covers the remount that drops the attribute before the browser repaints.

The locale links in `src/components/layout/LanguageSwitcher.tsx` pass `scroll={false}`. Without it, Next scrolls to the top on every navigation and a reader switching language mid-page is thrown back to the hero.

## Case study screenshots

`src/components/work/ScreenshotGallery.tsx` renders the screenshots of a case study as one horizontally scrollable row (CSS scroll-snap, one card per screen on a phone; a card is at most 42rem wide and 36rem tall at the screenshot's own ratio, so a 390x844 phone screenshot stays phone-sized, see `slideMaxWidthRem`) and opens the full-resolution file in a native `<dialog>` when a card is clicked. Any app with screenshots gets the gallery, private apps included, provided every value on screen is invented dummy data with no client company, brand, logo, domain, or person visible; an app without screenshots falls through to its cover in `CaseStudy.tsx`. A private app never has a live URL and keeps the "Private production system" label. On the homepage an app with screenshots shows its image cover on the card when it has one (so the strongest screen can lead while the gallery keeps flow order), otherwise its first screenshot; a private one stays `data-card="private"` with the lock chip, and an app without screenshots keeps the pattern cover even if its cover is an image. Only a public app with a screenshot and a live URL can be featured, and only the first one in content order is (`featuredSlug`), so Satellyte keeps the single wide card and Pawlo, the other public app, stays a plain card without the lock chip. Content order decides which qualifying app is featured, so moving Pawlo above Satellyte in /admin makes Pawlo the wide card. The public apps are Satellyte, Pawlo, UjiGo, and E-Passport (E-Passport links its real event page, so the brand in that URL is not in the client-name list either; its screenshots stay on a demo event). Pawlo's client agreed to be named, so "Pawlo" is not in the client-name list. Client company and brand names are refused by `src/lib/content/client-names.ts`, which stores them only as SHA-256 hashes with their lengths (the repository is public; its header comment shows how to add one): `checkContentReferences` rejects them in any fact or copy (so the build and the editor's `checkDraft` both refuse them), `checkDraft` also rejects them in pending upload paths, and `no-client-names.test.ts` checks the file names under `public/work/`.

The screenshots are captured outside this repository: each app runs locally on invented data and `~/Desktop/Tools/_showcase-shots/capture.mjs` (rules in that folder's README) saves 1920x1200 PNGs (390x844 for a phone-only app such as E-Passport), which are converted to WebP before they go into `public/work/<slug>/` or through `/admin`.

Two things the component depends on:

- Each screenshot carries its stored `width`/`height` from `content/projects.json` (the editor records them at upload) into `ProjectScreenshot`. The row reserves that box, and the dialog image takes the widest box at the same ratio inside 95vw x 90vh (`dialogImageWidth`), so a screenshot of any shape holds its space while it loads.
- `showModal()` runs in an effect keyed on the selected screenshot, not in the click handler, so the dialog never paints an empty frame before React commits the state change. Escape and backdrop dismissal come from the platform; only the close button is ours.

## Content and routes

Invariant facts live in `content/{site,portfolio,projects}.json`: names, slugs, dates, URLs, technologies, asset paths, section order and visibility. `src/lib/content` validates them at load: `schema.ts` holds the zod schemas, `validate.ts` the cross-reference rules (duplicate ids, duplicate social links and skill icons, copy entries that do not match their `COLLECTIONS` template, a public app with screenshots and no live URL, a private app with a live URL, an end month before the start, unknown archive references, a client name anywhere in facts or copy), `catalog.ts` the en/id catalog parity shared with the admin `checkDraft`, and `collections.ts` the `COLLECTIONS` list. `getContentFiles()` in `load.ts` throws listing every issue as `file path: message`, so a bad file fails the build instead of rendering a half-broken page. `src/data` are loaders that join facts with the message copy (`src/data/home.ts` builds the per-section models), with shared contracts in `src/types`.

Experience months are formatted with `Intl` in `src/lib/format-month.ts`; work-mode labels come from `common.labels.workMode`.

`scripts/test-routes.mjs` does not hard-code copy: it reads slugs, names, descriptors, the profile name, and action labels from the content and message files, so editing copy or adding an app does not break it. Reusable page composition is organized under `src/components/sections`, `src/components/work`, `src/components/layout`, and `src/components/ui`.

The logical document routes are available in English without a prefix and in Indonesian with `/id`:

- `/`
- `/id`
- `/work/satellyte`
- `/id/work/satellyte`
- `/work/palmgrade`
- `/id/work/palmgrade`
- `/work/autoerp`
- `/id/work/autoerp`
- `/work/ujigo`
- `/id/work/ujigo`
- `/work/production-tracking`
- `/id/work/production-tracking`
- `/work/ai-recruitment-platform`
- `/id/work/ai-recruitment-platform`
- `/work/internal-erp-platform`
- `/id/work/internal-erp-platform`
- `/work/factory-monitoring-system`
- `/id/work/factory-monitoring-system`
- `/work/archive`
- `/id/work/archive`
- `/sitemap.xml`
- `/robots.txt`
- `/opengraph-image`
- `/icon.svg`
- `/favicon.ico`

The CV is served from `/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf` by `public/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf`.

Update invariant project facts and route slugs in `content/projects.json`, general invariant portfolio facts in `content/site.json` and `content/portfolio.json`, localized copy in the message catalogs described above, and published project images in `public/work`. Keep the source CV and `src/assets` screenshots as source/reference material, then update their public copies only after verifying content, privacy, attribution, and alt text. Run the full validation commands above after content or asset changes.

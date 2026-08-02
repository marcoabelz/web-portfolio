# Marco Abel Zefanya — Portfolio

An editorial, server-first engineering portfolio built to present verified work clearly. The interface is responsive, accessible, and supports light and dark themes while keeping client-side JavaScript focused on interaction.

## Stack

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS
- Lucide React icons
- Vitest

## Local development

Use Node.js 18.17 or newer and pnpm 10.28.0 (the version declared in `package.json`).

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

## AI chat widget

The floating chat widget answers visitor questions using only the data in `src/data/portfolio.ts` and `src/data/projects.ts`. It has no other knowledge and declines everything off-topic.

Setup:

1. Create an API key at https://aistudio.google.com/apikey (free tier, no billing required).
2. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY`.
3. Restart the dev server.

Without `GEMINI_API_KEY` the widget does not render at all and `/api/chat` returns 503 — the feature fails closed rather than half-working.

Deploying: add `GEMINI_API_KEY` as an environment variable in the hosting dashboard (Vercel → Project → Settings → Environment Variables) for every environment that should have the chat. Never prefix it with `NEXT_PUBLIC_`; that would publish the key to every visitor.

Limits: 1000 characters per message, 20 messages of history, 5 messages per minute per IP, 20 messages per page load, 500 output tokens per reply.

Abuse handling, in `src/lib/chat/`:

- `validate.ts` rejects malformed bodies before anything reaches the model. It caps message length and history size but not the raw body — App Router handlers have no body-size limit of their own, so the effective ceiling is whatever the host enforces (4.5 MB on Vercel). Self-hosting behind your own proxy means setting that limit there.
- `rate-limit.ts` is a per-process in-memory limiter with a hard ceiling of 50,000 tracked keys. It fails closed at capacity rather than evicting, so a spoofed-IP flood cannot buy itself a fresh quota. It resets on cold start; move it to a shared store if one process stops being the whole app.
- `route.ts` rejects requests whose `Sec-Fetch-Site` header says they came from another origin. That is quota control, not authentication — it stops a drive-by page elsewhere from spending the key through its own visitors' IPs, which per-IP limiting cannot see.
- `prompt.ts` wraps visitor text in `<user_message>` delimiters and strips those tags from the input first, repeating until the string stops changing — a single pass would let `<use</user_message>r_message>` reassemble into a live tag.
- `route.ts` sanitises conversation history too. History arrives in the request body, so a forged `model` turn could otherwise fabricate an assistant concession.

Known limitation: the widget's own interface copy (button labels, greeting, placeholder) is English on both locales. Replies still follow the visitor's language because the system instruction asks for it, but the chrome is not yet wired into the message catalogs.

## Content editor

`/admin` edits the six message files in the browser and commits the result, so changing copy needs neither an editor nor a manual deploy: save, and the host rebuilds the site from the new commit in about a minute. Git is the storage — there is no database.

Setup:

1. Create a fine-grained personal access token at https://github.com/settings/personal-access-tokens, with repository access limited to this repository and one permission: `Contents: read and write`.
2. Fill in `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (`openssl rand -base64 32`), `GITHUB_TOKEN`, and `GITHUB_REPO` (`owner/repo`) in `.env.local`. `GITHUB_BRANCH` is optional and defaults to `main`.
3. Deploying: add the same variables in the hosting dashboard (Vercel → Project → Settings → Environment Variables). They take effect on the next deployment. Never prefix any of them with `NEXT_PUBLIC_`.

Without all five the editor fails closed like the chat widget: `/admin` is a 404 rather than a login box that could never succeed. `src/middleware.ts` skips `/admin` so it is never localized, and `robots.ts` disallows it.

What it can change:

- Wording only — every string in `messages/en` and `messages/id`, the two languages side by side. The form is generated from the JSON, so a key added to a message file becomes editable with no change to the editor.
- Adding a project, or changing a slug, date, URL, or technology list, is still a code change in `src/data`. Those are invariant facts and are deliberately not editable here.
- Add and remove on a list apply to both languages at once, so the en/id parity the tests require cannot be broken from the editor. Adding is offered only where an entry already exists, since an empty list gives no shape to copy.

Before committing, `checkDraft` in `src/lib/admin/draft.ts` re-checks the submitted draft against the repository: same shape, no blank strings, same leaf count in both languages, same ICU placeholders. A draft that fails is rejected with the reason and nothing is written. One save is one commit across all six files, so it is one rebuild rather than six.

Sign-in handling:

- The session is an expiry stamp signed with HMAC and kept in a cookie — no session store to run. It is `httpOnly`, `SameSite=Lax`, scoped to `/admin`, `Secure` in production, and lasts 8 hours.
- Credentials are compared through SHA-256 digests, so the comparison is constant-time and leaks no length, and both comparisons always run.
- Sign-in reuses the chat widget's per-IP limiter, so password guessing is throttled at the same 5 attempts per minute.
- `saveDraft` re-checks the session itself. Server actions are public endpoints; the page having rendered the editor is not proof the caller is signed in.

## Localization maintenance

English is the default locale and keeps unprefixed URLs. Indonesian uses the `/id` prefix. Routing is configured in `src/i18n/routing.ts`; path normalization and language alternates live in `src/i18n/locale.ts`.

Messages are split into three matching domains under `messages/en` and `messages/id`:

- `common.json` contains navigation, actions, section headings, labels, accessibility copy, language names, and footer copy.
- `portfolio.json` contains profile, experience, about, skills, education, and language copy.
- `projects.json` contains selected projects, archive projects, and case-study headings.

To add or edit copy, change the same key in both locale files for its domain. Keep stable IDs and invariant facts—names, slugs, dates, URLs, technologies, and asset paths—in `src/data` rather than duplicating them in messages. Do not build dynamic import paths from a request locale; register every catalog with static imports in `src/i18n/messages.ts`.

Run the message parity tests after every catalog change:

```bash
pnpm test src/i18n/messages.test.ts
```

The parity suite requires identical nonblank leaf keys and matching interpolation placeholders in English and Indonesian. Then run the full validation commands before publishing:

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

`src/components/work/ScreenshotGallery.tsx` renders the screenshots of a case study as one horizontally scrollable row (CSS scroll-snap, one card per screen on a phone) and opens the full-resolution file in a native `<dialog>` when a card is clicked. Only Satellyte has screenshots; every other project falls through to the sanitized cover in `CaseStudy.tsx`, which the gallery does not touch.

Two things the component depends on:

- Every published screenshot is exported at 1920x1200. The `width`/`height` on the dialog image are that size, so a differently proportioned file would be letterboxed by `object-contain` rather than reserving the wrong box.
- `showModal()` runs in an effect keyed on the selected screenshot, not in the click handler, so the dialog never paints an empty frame before React commits the state change. Escape and backdrop dismissal come from the platform; only the close button is ours.

## Content and routes

Typed portfolio content lives in `src/data`, with shared contracts in `src/types`. Reusable page composition is organized under `src/components/sections`, `src/components/work`, `src/components/layout`, and `src/components/ui`.

The seven logical document routes are available in English without a prefix and in Indonesian with `/id`:

- `/`
- `/id`
- `/work/satellyte`
- `/id/work/satellyte`
- `/work/palmgrade`
- `/id/work/palmgrade`
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

Update invariant project facts and route slugs in `src/data/projects.ts`, general invariant portfolio facts in `src/data/portfolio.ts`, localized copy in the message catalogs described above, and published project images in `public/work`. Keep the source CV and `src/assets` screenshots as source/reference material, then update their public copies only after verifying content, privacy, attribution, and alt text. Run the full validation commands above after content or asset changes.

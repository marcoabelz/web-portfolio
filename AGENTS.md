# web-portfolio — agent notes

The app lives in `client/` (Next.js 14 App Router, React 18, Tailwind, pnpm). Full
documentation is in [client/README.md](client/README.md); this file only records what is
easy to get wrong.

## Commands

Run everything from `client/`:

```bash
pnpm check        # lint + typecheck + vitest
pnpm test:routes  # production build, boots a server, smoke-checks every public route
```

Both must pass before work is called done. If a build fails on missing `.next` artifacts
(`*.nft.json` ENOENT, "Cannot find module for page"), the directory was left half-written by
a killed dev server: delete `.next` and `tsconfig.tsbuildinfo`, then rebuild.

## Copy changes

- Every user-visible string lives in `messages/{en,id}/{common,portfolio,projects}.json`.
  Both locales change together — the parity tests require identical nonblank leaf keys and
  matching ICU placeholders. The one exception is `ChatWidget.tsx`, whose own chrome is still
  hardcoded English on both locales; the README records that as a known limitation.
- Invariant facts (names, slugs, dates, URLs, technologies, asset paths) belong in
  `src/data`, never duplicated into messages.
- `scripts/test-routes.mjs` asserts literal copy per route. Renaming a heading means
  updating that manifest too.
- Indonesian copy uses "saya", never "aku", and keeps a professional register.
- Abel prefers short, direct headings. Section titles state the thing, not a sentence about
  it ("Pendidikan dan bahasa.", not "Tempat saya menempuh pendidikan dan bahasa yang saya
  gunakan."). The projects are called aplikasi/apps, not proyek/work, in reader-facing copy.

## Theme and locale switching

The theme rides on `data-theme` on `<html>` because React clears the `<html>` attributes it
owns (`className`) when a locale switch remounts the `[locale]` layout. Tailwind config,
`globals.css`, `ThemeScript.tsx`, and `ThemeToggle.tsx` all have to agree on that attribute;
`ThemeToggle.test.ts` fails if one drifts. Locale links pass `scroll={false}` so switching
language mid-page does not throw the reader back to the hero. See the README section
"Theme and locale switching".

## AI chat widget

`GEMINI_API_KEY` is server-side only and the feature fails closed: without it the widget does
not render and `/api/chat` returns 503, so a missing key looks like a missing feature rather
than an error. Never rename it to `NEXT_PUBLIC_*`. The abuse controls in `src/lib/chat/`
(input validation, per-IP rate limiting, prompt delimiting, history sanitising) each exist to
close a specific hole — read the README section before simplifying any of them.

## Content editor

`/admin` is the one surface that changes copy without a code change: it edits the six
message files and commits them through the GitHub API. Read the README section "Content
editor" before touching it. What is easy to get wrong:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `GITHUB_TOKEN`, and `GITHUB_REPO`
  are required together and server-side only. A missing one makes `/admin` a 404 on
  purpose, the same fail-closed shape as `GEMINI_API_KEY`. Never rename them to
  `NEXT_PUBLIC_*`.
- `middleware.ts` excludes `/admin` next to `/api`. Without that exclusion the locale
  middleware redirects `/admin` to `/en/admin`, which does not exist; `middleware.test.ts`
  fails if it drifts.
- en/id parity is enforced twice: `Editor.tsx` applies every add and remove to both locales
  at once, and `checkDraft` re-verifies leaf paths and ICU placeholders on the server
  because a server action is a public endpoint. Neither layer is redundant.
- `Fields.tsx` holds the recursive form renderer only so it can be render-tested without
  mocking the server actions — `Editor.tsx` imports `./actions`, which `Fields.test.tsx`
  cannot load.

## Case study screenshots

`ScreenshotGallery.tsx` is the only client component under `src/components/work`. It shows
the screenshots as one scroll-snap row and zooms into a native `<dialog>`; `showModal()` has
to stay in the effect keyed on the selected screenshot, or the dialog paints one empty frame.
The dialog image is sized from the 1920x1200 export every screenshot uses. Only Satellyte
reaches this component — see the privacy constraint below.

## Privacy constraint

Satellyte is the only public project. Palmgrade, the AI recruitment platform, the internal
ERP, and the factory monitoring system are private production systems: no factory or
customer imagery, no company data, no internal URLs, no document contents, no private source
code. Their cards use the sanitized-visual and private-production-system labels, and only
Satellyte carries screenshots.

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
  `client/content/{site,portfolio,projects}.json`, never duplicated into messages. They are
  validated by `src/lib/content`; a broken file fails the build naming `file path: message`.
  `src/data` joins them with the message copy and builds the section models. Slugs are
  immutable once created (they are URLs).
- `scripts/test-routes.mjs` no longer asserts literal copy: it reads slugs, names,
  descriptors, and action labels from the content and message files. Renaming a heading
  needs no manifest edit. Tests assert rules, not copy; keep it that way: derive names, ids,
  and counts from `getContentFiles()` or the messages, and give tests that need a
  particular entry shape a fixture (`labFixtureDraft`, `appSlugWith`, `withFixtureScreenshot`,
  `privateAppWithShotsDraft` in `src/lib/admin/test-draft.ts`; the screenshot fixtures use the
  profile portrait, so no test needs a real app to have screenshots or to be public). An `/admin` publish must never turn `pnpm check` red.
- Homepage section order and visibility come from `content/site.json` `sections`.
  `resolveHomeSections` hides a section that is switched off or has no entries
  (Testimonials ships empty, Lab hides when emptied) and renumbers the rest without gaps;
  the nav derives from the same result. Never hand-number a section.
- Technology logos resolve server-side from `simple-icons` in `src/lib/icons.ts`, with a
  monogram fallback. Chips reference them as `<use href="/icons.svg#si-{slug}">` from one
  static sprite route (`src/app/icons.svg`), never inline paths: those bloated the homepage
  HTML. Anything that loads shows a skeleton (`SkeletonImage`, `loading.tsx`).
- Budget: homepage First Load JS at most +10 kB over the 101 kB baseline, Lighthouse
  mobile performance at least 95, CLS at most 0.05.
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

`/admin` is the one surface that changes content without a code change: it edits the three
content files (facts, collections, section order and visibility), the six message files, and
uploaded images and the CV, and commits them through the GitHub API as one commit, guarded so
it fails with `BranchMovedError` if the branch moved after the editor loaded. A key the schema
(`src/lib/admin/schema.ts`) does not map appears under "Other" until it is. Read the README
section "Content editor" before touching it. What is easy to get wrong:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `GITHUB_TOKEN`, and `GITHUB_REPO`
  are required together and server-side only. A missing one makes `/admin` a 404 on
  purpose, the same fail-closed shape as `GEMINI_API_KEY`. Never rename them to
  `NEXT_PUBLIC_*`. `GITHUB_BRANCH` is optional and defaults to `main`.
- `checkDraft` (`src/lib/admin/draft.ts`) is the server-side trust boundary: a server action
  is a public endpoint, so everything the browser sends is re-checked there, including that a
  pending upload's `sha` is a 40-hex git blob id and that `site.profile.resumePath` equals the
  repository's (the CV URL is fixed; the editor only replaces the file behind it).
- `middleware.ts` excludes `/admin` next to `/api`. Without that exclusion the locale
  middleware redirects `/admin` to `/en/admin`, which does not exist; `middleware.test.ts`
  fails if it drifts.
- en/id parity is enforced twice: the draft operations (`src/lib/admin/operations.ts`) apply every add and remove to both
  locales at once, and `checkDraft` re-verifies leaf paths and ICU placeholders (and every content rule) on the server
  because a server action is a public endpoint. Neither layer is redundant.
- `COLLECTIONS` (`src/lib/content/collections.ts`) holds the item shapes of every collection
  for both the server validator and the editor, and the parity check exempts message keys
  inside those containers. Change a shape there once; never copy it into the schema or the UI.
- Shape-swapping operations (cover kind, app privacy, lab source) replace a whole entry and
  its copy rather than patching a field, because the two shapes have different keys. Going
  private drops the live URL (screenshots and captions stay). Do not turn them into plain `setFact`.
- `danglingFieldPaths` skips a field guarded by `showWhen` when no entry currently has that
  kind (no repo Lab entry, no pattern cover), so removing the last entry of a kind in the
  editor does not fail `schema.test.ts`. A field marked `optional` (the archive repository URL)
  is skipped the same way when no entry sets it.
- The browser backup (`editor/backup.ts`) stores the draft with the base it was made on.
  A publish clears both backup keys. Restoring against a newer site rebases
  (`editor/rebase.ts`): only the backup's own edits are re-applied per leaf, upstream
  additions survive, and a leaf changed on both sides keeps the local value and is listed in
  the restore prompt. Backups without a base fall back to the whole-snapshot restore with the
  "site changed" warning, and a stored draft that fails `parseContentFiles` is never offered.
- An upload alone never commits. `uploadMedia` makes a loose blob on GitHub and the draft
  carries it as a pending upload; it joins the repository only when a publish references it.
  Uploads are shrunk in the browser (`prepareImage`: at most 2400px, WebP or a JPEG fallback,
  4 MB), and never SVG. After a publish the pending uploads become repository files: the
  reducer moves their paths into `publicFiles` and empties `draft.media`.
- `Fields.tsx` (the "Other" section's renderer for uncovered copy) and everything under
  `editor/`, including the typed inputs in `editor/fields/`, import nothing from
  `actions.ts`, so they can be render-tested without mocking the server actions;
  `layout.test.tsx` scans the folder. Uploads and icon search reach them only through
  `EditorHandlers`.

## Case study screenshots

`ScreenshotGallery.tsx` is the only client component under `src/components/work`. It shows
the screenshots as one scroll-snap row and zooms into a native `<dialog>`; `showModal()` has
to stay in the effect keyed on the selected screenshot, or the dialog paints one empty frame.
Both the row and the dialog are sized from each screenshot's stored `width`/`height` (carried
from `content/projects.json` into `ProjectScreenshot`), never a fixed export size; a slide is
capped at 42rem wide and 36rem tall (`slideMaxWidthRem`), so portrait phone shots stay
phone-sized. Any app with
screenshots reaches this component, private ones included (dummy data only) — see the privacy
constraint below.
On the homepage card, an app with screenshots shows its image cover when it has one, else its
first screenshot (`cardImage` in `src/data/home.ts`); the gallery keeps flow order. Client
names (`CLIENT_NAME_HASHES` in `src/lib/content/client-names.ts`, SHA-256 hashes only because the repo
is public; tests use an invented name) are refused by
`checkContentReferences` and by `checkDraft` for upload paths, so an `/admin` publish naming a
client fails before it commits; employers are allowed and "sawit" is a plain word.

## Privacy constraint

The public apps with a live URL are Satellyte, Pawlo (slug `pet-microsite`, live at hellopawlo.com; its client agreed to be named), UjiGo (ujigo.id, Abel's own product), and E-Passport (its real event page, approved by Abel, so the brand in that URL is not in the client-name list; its screenshots stay on an invented demo event and the copy says so, and the copy adds no brand names). Satellyte stays the one featured card: `featuredSlug` features only the first qualifying app in content order. Content order decides which qualifying app is featured, so moving Pawlo above Satellyte in /admin makes Pawlo the wide card. Pawlo's visitor screens are captured from the public live site; its CMS screens run on demo data (the invented "PetCare" brand). The other apps are private production systems: they may show screenshots only when every value on screen is invented dummy data and no client company, brand, logo, domain, or person is visible; they never link to a live system or source code, and keep the "Private production system" label. The validator enforces the live-URL half (a private app cannot have a `liveUrl`); the dummy-data half cannot be checked by code, so look at every screenshot before it is uploaded.

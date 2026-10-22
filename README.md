# web-portfolio

Personal portfolio of Marco Abel Zefanya — bilingual (English and Indonesian), server-rendered, and editable without a deploy.

## Layout

| Path | What is in it |
| --- | --- |
| `client/` | The Next.js application. Everything runnable lives here. |
| `docs/` | Design specs and implementation plans, one pair per feature. |
| `AGENTS.md` | Notes for AI coding agents working in this repository. |

Full documentation is in [client/README.md](client/README.md).

## Getting started

```bash
cd client
pnpm install
pnpm dev
```

The site is on http://localhost:3000. Copy `client/.env.example` to `client/.env.local` first — the app runs without any of the keys, it just serves fewer features.

## Checks

Run both from `client/` before calling work done:

```bash
pnpm check        # lint + typecheck + vitest
pnpm test:routes  # production build, boots a server, smoke-checks every public route
```

## What it does

- **Two languages.** English keeps unprefixed URLs, Indonesian uses `/id`. Every visible string lives in `client/messages/{en,id}/`, and tests fail if the two drift apart.
- **A chat widget** that answers questions about the work using only the facts in `client/content/*.json` and the copy in `client/messages`, joined in `client/src/data`, and declines everything else. Off unless `GEMINI_API_KEY` is set.
- **A content editor at `/admin`** that edits the site's facts (`client/content/*.json`), both languages of the copy, images, the CV, and section order and visibility in the browser, and commits the result to this repository as one commit, so changing content needs neither a code editor nor a manual deploy. Off unless its five environment variables are set. See [Content editor](client/README.md#content-editor).

## Deployment

Vercel, with **Root Directory** set to `client`. A push to the production branch deploys; every other branch gets a preview. Environment variables are set per environment in the project settings and take effect on the next deployment — the editor's variables, `GEMINI_API_KEY`, and `NEXT_PUBLIC_SITE_URL` are all server-side configuration, and a production build fails outright if `NEXT_PUBLIC_SITE_URL` is missing or malformed.

## License

[MIT](LICENSE). The code is free to reuse; the content, images, and CV are not.

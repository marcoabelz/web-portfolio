# Portfolio Website Update Plan - Marco Abel Zefanya

## Purpose

Update the existing portfolio website so it accurately represents Marco Abel Zefanya as a production-level Full-Stack Engineer with experience across B2B SaaS, AI systems, computer vision, ERP, industrial monitoring, backend systems, automation, and infrastructure.

The current visual direction is clean and should be preserved. The main problems are outdated content, junior/bootcamp-oriented information architecture, overly long project sections, missing current work experience, weak SEO metadata, and accessibility/performance issues.

## Working Rules for Codex

1. Inspect the existing repository, framework version, component structure, data files, styling system, package manager, and available scripts before editing.
2. Preserve the existing blue visual identity, card styling, spacing language, and profile photo unless a change is explicitly requested below.
3. Refactor existing components when practical instead of rebuilding the entire site from scratch.
4. Keep content data-driven. Experience, skills, projects, navigation, and social links should come from typed data structures rather than repeated JSX.
5. Do not invent business metrics, employers, dates, technologies, repository URLs, testimonials, or achievements.
6. Do not expose private source code, credentials, customer data, internal URLs, or confidential screenshots.
7. Where a repository is private, show plain text such as `Private repository` instead of a fake or disabled link.
8. Do not commit, push, open a pull request, or deploy to Vercel. Implement and verify locally only.
9. Preserve unrelated user changes already present in the repository.
10. Use the repository's existing package manager and scripts. Do not replace the package manager or perform broad dependency upgrades unless necessary for the requested changes.

## Source of Truth

Use the following dates and titles unless the repository already contains a newer user-authored correction that clearly supersedes this brief:

| Company | Title | Location | Dates |
| --- | --- | --- | --- |
| Satellyte | Full-Stack Engineer | Jakarta, Indonesia | March 2026 - Present |
| PT Nexio Teknologi | Full-Stack Engineer | Karawang, Indonesia | September 2025 - March 2026 |
| PT Delta Anugrah | Full-Stack Developer | Jakarta, Indonesia | August 2024 - August 2025 |
| PT SYS Indonesia | Software QA Engineer | Jakarta, Indonesia | September 2021 - November 2023 |

Professional positioning:

> Full-Stack Engineer with 4+ years of combined experience across production software development and embedded software quality assurance, including nearly 2 years building production products.

## Target Information Architecture

Replace the current education-first structure with this order:

1. Navigation
2. Hero
3. Selected Work
4. Professional Experience
5. About
6. Technical Skills
7. Education and English proficiency
8. Contact
9. Footer

Recommended navigation:

```text
Work | Experience | About | Skills | Contact | Resume
```

Requirements:

- Remove Education as the first navigation item.
- Keep navigation anchors working with the sticky header.
- Provide an accessible mobile menu.
- Make the current section visually understandable without relying only on color.
- Keep the Resume action visually distinct.

## Hero Section

Use Marco's full name, not only `Marco Abel`.

### Required copy

```text
Marco Abel Zefanya

Full-Stack Engineer
Backend, AI Systems & Production Infrastructure

I build production-grade SaaS and AI-powered products end-to-end, from Next.js interfaces and Fastify APIs to data pipelines, browser automation, computer vision, and Docker-based deployment.
```

Primary actions:

```text
View Selected Work
Download Resume
```

Secondary action:

```text
Get in Touch
```

Hero requirements:

- Preserve the existing profile photo.
- Keep only one page-level `h1`, containing `Marco Abel Zefanya`.
- Use a descriptive role label instead of `Web Developer` or the generic `Full Stack Developer` label.
- Ensure the hero remains balanced and readable at mobile, tablet, laptop, and wide desktop widths.
- Optimize the hero photo as the likely LCP image. Provide explicit dimensions and an appropriate responsive `sizes` value.

## Selected Work

Rename `Project Experiences` to `Selected Work`.

The homepage should prioritize production and commercial work. Show no more than five primary case studies:

1. Satellyte - AI Sales Intelligence Platform
2. Palmgrade - Industrial Computer Vision System
3. AI Recruitment Platform
4. Internal ERP Platform
5. Factory Monitoring System

If confidentiality prevents a full case study, provide a sanitized summary with no private data.

Move older bootcamp projects such as Xiaopee, Instaclone, Chatting App, M Event, and Omahucok into a collapsed `Earlier Projects` or `Project Archive` section, or remove them from the homepage. Nutrical and Zamasto may remain under `Other Commercial Work` when the content is accurate and publication is permitted.

### Homepage project-card format

Each primary project card should contain:

- One optimized cover image
- Project name
- One-sentence outcome
- Marco's role
- Context label such as `Production`, `Commercial`, or `Internal`
- Three concise highlights
- Five to eight relevant technology tags
- `View Case Study`, `Live Product`, or `Private Project` as appropriate

Do not render every project screenshot on the homepage.

### Dedicated case-study format

When the current architecture supports routes, create a dedicated page for each primary project using this structure:

1. Overview
2. Problem
3. Role and responsibilities
4. What was built
5. Key technical decisions
6. Reliability or operational constraints
7. Verifiable outcome
8. Technology stack
9. Sanitized screenshot gallery

Never invent outcome metrics. Qualitative outcomes are acceptable when no verified metric is available.

### Project content guidance

#### Satellyte - AI Sales Intelligence Platform

Use only public or sanitized information:

- AI-powered B2B sales intelligence platform
- Buying-signal processing and lead scoring
- Next.js dashboards
- Fastify and BullMQ services
- Multi-provider enrichment workflows
- Playwright and Browserbase automation
- Public REST APIs, authentication, credit metering, and rate limiting
- Docker, GitHub Actions, and GHCR production delivery

Do not expose provider credentials, internal endpoints, customer information, safety thresholds, or proprietary scoring rules.

#### Palmgrade - Industrial Computer Vision System

Highlights:

- Real-time palm fruit grading
- Three industrial camera feeds
- Python, FastAPI, YOLO, OpenCV, and TensorRT
- Next.js operator dashboard for three production lines
- Role-based access control and event delivery
- Idempotency keys, local buffering, and batch synchronization for unstable factory connectivity

#### AI Recruitment Platform

Highlights:

- Multi-tenant recruitment system
- AI CV screening
- Voice-based AI interviews
- Candidate pipeline and interview workflows
- Stripe billing and usage controls
- TypeScript backend and Next.js recruiter dashboard

#### Internal ERP Platform

Highlights:

- Sales, Purchasing, Inventory, and Production workflows
- Next.js, React, TypeScript, Node.js, and Express.js
- PostgreSQL and MongoDB data models
- Authentication and role-based access
- Search, filtering, pagination, exports, and cross-document workflows

#### Factory Monitoring System

Highlights:

- MQTT sensor ingestion
- Node-RED processing
- TimescaleDB storage
- Grafana visualization
- Telegram reporting bot
- Docker-based deployment

## Professional Experience

Add all four roles in reverse chronological order. Keep each role concise enough to scan quickly.

### Satellyte

```text
Full-Stack Engineer | March 2026 - Present

- Build an AI-powered B2B sales intelligence platform that transforms buying signals into scored leads.
- Develop Next.js dashboards and Fastify/BullMQ services that process multiple buying-signal strategies.
- Build multi-provider enrichment workflows for identifying and scoring decision-makers.
- Implement browser automation using Playwright and Browserbase.
- Develop public REST APIs with authentication, credit metering, and rate limiting.
- Support production delivery using Docker, GitHub Actions, and GHCR.
```

### PT Nexio Teknologi

```text
Full-Stack Engineer | September 2025 - March 2026

- Built and shipped three production systems spanning computer vision, AI recruitment, and industrial monitoring.
- Developed a Python computer-vision service using FastAPI, YOLO, OpenCV, and TensorRT for three industrial camera feeds.
- Built TypeScript APIs, role-based access control, event delivery, and a Next.js operator dashboard for three production lines.
- Designed resilient data delivery using idempotency keys, local buffering, and batch synchronization.
- Developed a multi-tenant AI recruitment platform with AI CV screening, voice interviews, candidate pipelines, and Stripe billing.
- Built a monitoring pipeline using MQTT, Node-RED, TimescaleDB, Grafana, and a Telegram reporting bot.
```

### PT Delta Anugrah

```text
Full-Stack Developer | August 2024 - August 2025

- Developed an internal ERP platform connecting Sales, Purchasing, Inventory, and Production operations.
- Built Next.js and React interfaces supported by REST APIs developed with Node.js and Express.js.
- Designed data models using PostgreSQL and MongoDB.
- Translated internal operational workflows into practical product features.
```

### PT SYS Indonesia

```text
Software QA Engineer | September 2021 - November 2023

- Performed white-box testing on embedded automotive transmission control software written in C.
- Achieved the required 100% test coverage across assigned software modules.
- Developed unit tests using winAMS according to internal and automotive engineering standards.
- Debugged output discrepancies and built Excel-based verification tools.
- Produced traceable test cases, coverage reports, and technical documentation.
```

## About Section

Use concise narrative copy:

```text
I'm a Full-Stack Engineer with 4+ years of combined experience across production software development and embedded software quality assurance.

My work spans B2B SaaS, AI-powered products, computer vision, enterprise software, industrial monitoring, browser automation, billing systems, and production infrastructure. I enjoy taking products from operational requirements through system design, implementation, deployment, and production reliability.

My QA background shaped the systematic approach I bring to debugging, testing, traceability, and resilient software delivery.
```

Avoid generic claims such as `passionate programmer`, `hard worker`, or `clean code enthusiast` unless supported by more specific evidence.

## Technical Skills

Replace the current beginner-oriented logo wall with grouped, prioritized skills. A compact logo treatment is acceptable, but text labels must remain readable and accessible.

Use these groups:

```text
Programming Languages
TypeScript, JavaScript, Python, SQL, C

Frontend
React, Next.js, React Native, TanStack Query, Tailwind CSS

Backend & APIs
Node.js, Fastify, Express.js, FastAPI, REST APIs, GraphQL, BullMQ

Databases
PostgreSQL, MongoDB, Redis, TimescaleDB

AI & Automation
LLM APIs, Playwright, Browserbase, YOLO, OpenCV, TensorRT

Infrastructure
Docker, GitHub Actions, GHCR, DigitalOcean, Nginx, Cloudflare

Industrial & IoT
MQTT, Node-RED, Grafana, Raspberry Pi
```

Remove or de-emphasize baseline tools such as HTML, Bootstrap, Vite, Postman, Excel, and Visual Studio Code. Do not show PHP unless it is still intentionally part of Marco's target positioning.

## Languages and Education

Languages:

```text
Indonesian - Native
English - Working Proficiency
Englishvit TOEFL ITP-style Assessment - Score: 477, November 2024
```

Do not describe the Englishvit assessment as an official ETS TOEFL result.

Education:

```text
Hacktiv8
Full Stack JavaScript Immersive Program
March 2024 - July 2024 | Final Score: 94.2/100

Universitas Gunadarma
Informatics Engineering
2016 - 2020 | GPA: 3.21/4.00
```

Education should appear after experience and skills, not immediately after the hero.

## Contact Section

Use:

```text
Jakarta, Indonesia
Open to relevant full-stack, backend, and AI product engineering opportunities.
```

Contact methods:

- Email
- LinkedIn
- GitHub
- Optional WhatsApp link

Remove the precise street address from the public website. Instagram should be removed or visually de-emphasized because it is not central to the professional engineering profile.

Every icon-only social link must have an accessible name, for example:

```tsx
<a
  href="https://github.com/marcoabelz"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Marco Abel Zefanya on GitHub"
>
  <GithubIcon aria-hidden="true" />
</a>
```

## Resume Handling

Replace the outdated Google Drive resume when the new PDF is available.

Preferred implementation:

```text
/public/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf
```

The Resume button should point directly to this file and use a meaningful filename when opened or downloaded.

Do not fabricate the PDF. If it is not present in the repository, keep the current working link temporarily and report that the new file must be added manually.

## Repository Link Cleanup

Fix these known issues:

- Remove every `href="-"` repository link.
- Replace missing repository links with non-clickable `Private repository` text.
- Verify that each public repository link matches the displayed project.
- The current Chatting App link appears to reference a `Sprite-LadderSnakeGame` repository; correct it only if the actual Chatting App URL exists in the repository data. Otherwise remove the link.
- Ensure every external `target="_blank"` link uses `rel="noopener noreferrer"`.

## SEO and Social Metadata

Replace the current generic metadata.

Required title:

```text
Marco Abel Zefanya | Full-Stack Engineer
```

Required description:

```text
Full-Stack Engineer specializing in backend systems, AI-powered products, computer vision, browser automation, and production infrastructure.
```

Implement using the framework's native metadata API where available:

- Title and description
- Canonical URL
- Open Graph title
- Open Graph description
- Open Graph image
- Twitter/X card metadata
- Favicon and application icons
- `robots.txt`
- `sitemap.xml`
- Person structured data using JSON-LD

Do not leave `Generated by create next app` anywhere in metadata.

Use environment/site configuration for the canonical base URL so it can be changed when a custom domain is introduced.

## URL and Branding

The current deployment URL contains `portofolio`, while the English spelling is `portfolio`.

Do not change deployment configuration automatically. Make the code domain-agnostic and document these optional follow-up choices:

- Use a correctly spelled Vercel project slug.
- Add a personal custom domain such as `marcoabel.dev`, `marcozefanya.dev`, or another user-selected domain.
- Redirect the previous URL after the user configures the new domain.

## Accessibility

Requirements:

- Exactly one page-level `h1`.
- Use `h2` for sections and `h3` for project and company headings.
- Replace generic `Project Picture` alt text with descriptive alt text.
- Decorative images must use empty alt text.
- Icon-only links and buttons must have accessible names.
- All interactive controls must be keyboard accessible.
- Provide visible focus styles.
- Do not rely only on color to communicate state.
- Maintain reasonable color contrast.
- Respect `prefers-reduced-motion` for animations.
- The mobile navigation must expose correct expanded/collapsed state through ARIA.

## Performance

The audited homepage contained approximately 102 image elements, with most project images using the generic alt text `Project Picture`. Reduce initial-page complexity.

Requirements:

- Render one cover image per project on the homepage.
- Move screenshot galleries to dedicated project pages or load them only after explicit interaction.
- Use the framework's optimized image component when appropriate.
- Provide width, height, and responsive `sizes` values.
- Prefer WebP or AVIF output where supported.
- Lazy-load below-the-fold images.
- Prioritize only the actual hero/LCP image.
- Avoid loading full-resolution 1920-3840px screenshots into small cards.
- Prevent cumulative layout shift by reserving media dimensions.
- Ensure there is no horizontal overflow at common mobile widths.
- Avoid unnecessary client-side JavaScript; keep static content server-rendered when the framework allows it.

## Footer

Use a dynamic year:

```tsx
© {new Date().getFullYear()} Marco Abel Zefanya
```

Do not leave a hard-coded `© 2025` value.

## Code Quality

- Use semantic HTML.
- Use typed data models for experience, project, skill, education, and social-link content.
- Avoid duplicated strings across desktop and mobile components.
- Remove dead data and unused imports created by the refactor.
- Do not add a heavy UI library solely for this update.
- Preserve or improve responsive behavior.
- Keep animations subtle and avoid long entrance delays that temporarily produce blank sections after anchor navigation.
- Ensure anchor navigation consistently reveals the target content immediately.

## Verification

Codex must determine the package manager from the repository lockfile and run the relevant existing commands.

At minimum:

1. Install dependencies only if needed.
2. Run the existing lint command.
3. Run type checking if configured.
4. Run automated tests if configured.
5. Run a production build.
6. Start a local preview when possible.
7. Inspect desktop and mobile layouts.
8. Test every navigation anchor.
9. Verify Resume, email, LinkedIn, GitHub, project, and contact links.
10. Confirm there are no app-origin console errors.
11. Confirm metadata is present in the rendered document.
12. Confirm no `href="-"`, `Generated by create next app`, `Project Picture`, outdated dates, or hard-coded `© 2025` remains.

Suggested repository searches:

```bash
rg -n 'Generated by create next app|Project Picture|© 2025|August 2024 - Present|December 2023|Quality Assurance Staff|Web Developer|Full Stack Developer' .
rg -n "href=['\"]-['\"]" .
```

## Acceptance Criteria

The work is complete only when:

- Satellyte, Nexio, Delta, and SYS experience is present with the correct dates.
- Selected production work appears before education.
- The hero positions Marco as a Full-Stack Engineer focused on backend, AI systems, and production infrastructure.
- The homepage has no more than five primary project case studies.
- Older bootcamp projects no longer dominate the homepage.
- Repository placeholders and mismatched links are removed or corrected.
- SEO metadata no longer uses framework defaults.
- Only one page-level `h1` exists.
- Project images have useful alt text.
- Social icon links have accessible labels.
- The footer year is dynamic.
- The site builds successfully.
- Desktop and mobile layouts have no obvious clipping or horizontal overflow.
- No unrelated user changes are overwritten.
- No commit, push, PR, or deployment is performed.

## Required Final Report From Codex

After implementation, report:

1. Files changed
2. Main content and layout changes
3. SEO, accessibility, and performance changes
4. Validation commands run and their results
5. Any missing assets, private-project content, or resume file that still requires user input
6. Confirmation that no commit, push, or deployment was performed

## Command to Run From the Portfolio Repository

Copy this file into the root of the portfolio repository, then run:

```bash
codex exec --sandbox workspace-write - < portfolio-vercel-update-plan.md
```

`codex exec` reuses the saved Codex CLI login. The command above gives Codex workspace write access and passes this Markdown file as the full task prompt.

For an interactive session instead:

```bash
codex --sandbox workspace-write
```

Then enter:

```text
Read portfolio-vercel-update-plan.md completely. Inspect the existing repository, implement every in-scope requirement, preserve unrelated changes, run the available verification commands, and do not commit, push, open a pull request, or deploy. If a requirement depends on a missing private asset or unknown factual information, leave a clear TODO and continue with everything else.
```

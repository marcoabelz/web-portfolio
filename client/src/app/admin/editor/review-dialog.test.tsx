import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { removeEntry, setCopy, setFact } from "@/lib/admin/operations";
import { labFixtureDraft, repoDraft } from "@/lib/admin/test-draft";

import { RestorePrompt, relativeTime } from "./RestorePrompt";
import { ReviewDialog, type PublishOutcome } from "./ReviewDialog";
import { buildReview, type Review } from "./review";

const base = repoDraft();
const heroLead = { domain: "portfolio", path: ["profile", "intro", "lead"] } as const;
const noop = () => {};

// Removing the archive project an archive Lab entry points at blocks the publish. The
// fixture owns that Lab entry, so the real content does not need one.
function blockedReview(): Review {
  const labBase = labFixtureDraft();
  const lab = labBase.content.portfolio.lab.find((entry) => entry.source === "archive") as { archiveId: string };

  return buildReview(labBase, removeEntry(labBase, "archiveProjects", lab.archiveId), []);
}

const publicFiles = [
  base.content.site.profile.resumePath,
  base.content.site.profile.portrait.src,
  ...base.content.projects.selected.flatMap((app) => [
    ...(app.cover.kind === "image" ? [app.cover.src] : []),
    ...app.screenshots.map((shot) => shot.src),
  ]),
  ...base.content.projects.archive.map((project) => project.cover.src),
];

const cleanReview = () => buildReview(base, setCopy(base, "en", heroLead, "New lead"), publicFiles);

function render(review: Review, extra: Partial<Parameters<typeof ReviewDialog>[0]> = {}): string {
  return renderToStaticMarkup(
    <ReviewDialog review={review} draft={base} open repo="owner/repo" onPublish={noop} onClose={noop} {...extra} />,
  );
}

// The Publish button's own tag. Its classes mention "disabled:" for the styled state, so
// only the attribute `disabled=""` says whether it is switched off.
function publishButton(html: string): string {
  const found = /<button[^>]*>Publish(?:ing…)?<\/button>/.exec(html)?.[0];

  if (!found) {
    throw new Error("no Publish button rendered");
  }

  return found;
}

describe("ReviewDialog", () => {
  it("renders issues above the changes and disables publish", () => {
    const html = render(blockedReview());

    expect(html.indexOf("data-issues")).toBeLessThan(html.indexOf("data-changes"));
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Publish/);
    expect(publishButton(html)).toContain('disabled=""');
    expect(html).toContain("Lab ›");
  });

  it("labels both languages and previews the commit message", () => {
    const review = buildReview(
      base,
      setCopy(setCopy(base, "en", heroLead, "New lead"), "id", heroLead, "Lead baru"),
      publicFiles,
    );
    const html = render({ ...review, canPublish: true });

    expect(html).toContain("English");
    expect(html).toContain("Indonesian");
    expect(html).toContain("New lead");
    expect(html).toContain("Lead baru");
    expect(html).toContain("content: update hero");
    expect(publishButton(html)).not.toContain('disabled=""');
  });

  it("says more checks run once an early stage is fixed", () => {
    expect(render({ ...blockedReview(), moreChecks: true })).toContain("More checks run after these are fixed.");
    expect(render({ ...blockedReview(), moreChecks: false })).not.toContain("More checks run");
  });

  it("names a change no field lists instead of showing an empty list", () => {
    const html = render({ ...cleanReview(), groups: [], unlisted: true });

    expect(html).toContain("Formatting or unlisted changes");
    expect(publishButton(html)).not.toContain('disabled=""');
  });

  it("says nothing to publish for an empty review", () => {
    const html = render({ ...cleanReview(), groups: [], unlisted: false, canPublish: false });

    expect(html).toContain("Nothing to publish.");
    expect(publishButton(html)).toContain('disabled=""');
  });

  it("shows a thumbnail for a pending upload", () => {
    const edited = setFact(base, { file: "site", path: ["profile", "portrait", "src"] }, "/media/2026/me-1.webp");
    edited.media = [{ kind: "image", repoPath: "client/public/media/2026/me-1.webp", publicPath: "/media/2026/me-1.webp", sha: "s" }];
    const html = render(buildReview(base, edited, publicFiles), { previews: { "/media/2026/me-1.webp": "blob:preview" } });

    expect(html).toContain('src="blob:preview"');
  });

  it("disables publish and shows a spinner while publishing", () => {
    const html = render(cleanReview(), { publishing: true });

    expect(publishButton(html)).toContain('disabled=""');
    expect(html).toContain('role="status"');
  });

  it("links the commit after a successful publish", () => {
    const outcome: PublishOutcome = { kind: "published", sha: "abc123" };
    const html = render(cleanReview(), { outcome });

    expect(html).toContain("Published. The site updates after the next deploy finishes, usually about a minute.");
    expect(html).toContain('href="https://github.com/owner/repo/commit/abc123"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
    expect(html).not.toContain("data-changes");
  });

  it("explains a conflict and offers a reload", () => {
    const html = render(cleanReview(), { outcome: { kind: "conflict" } });

    expect(html).toContain(
      "The site changed since you opened the editor. Your draft is saved in this browser. Reload to apply it again.",
    );
    expect(html).toContain(">Reload<");
  });

  it("explains an expired session and links to sign in", () => {
    const html = render(cleanReview(), { outcome: { kind: "signed-out" } });

    expect(html).toContain("Your session expired. Your draft is saved in this browser. Sign in again to restore it.");
    expect(html).toContain('href="/admin"');
  });

  it("keeps the dialog open on invalid, listing the server's issues", () => {
    const html = render(cleanReview(), {
      outcome: { kind: "invalid", issues: [{ file: "site", path: "profile.name", message: "Required." }] },
    });

    expect(html).toContain("data-issues");
    expect(html).toContain("Required.");
    expect(publishButton(html)).toContain('disabled=""');
  });

  it("renders no content while closed", () => {
    expect(renderToStaticMarkup(<ReviewDialog review={cleanReview()} draft={base} open={false} repo="o/r" onPublish={noop} onClose={noop} />)).not.toContain("data-changes");
  });
});

describe("RestorePrompt", () => {
  const now = Date.parse("2026-10-21T12:00:00.000Z");

  it.each([
    ["2026-10-21T11:59:40.000Z", "just now"],
    ["2026-10-21T11:55:00.000Z", "5 minutes ago"],
    ["2026-10-21T11:00:00.000Z", "an hour ago"],
    ["2026-10-21T08:00:00.000Z", "4 hours ago"],
    ["2026-10-19T12:00:00.000Z", "2 days ago"],
    ["not a date", "earlier"],
  ])("relative time for %s", (savedAt, expected) => {
    expect(relativeTime(savedAt, now)).toBe(expected);
  });

  it("offers the draft with the brief's copy", () => {
    const html = renderToStaticMarkup(
      <RestorePrompt savedAt="2026-10-21T11:55:00.000Z" now={now} siteChanged={false} onRestore={noop} onDiscard={noop} />,
    );

    expect(html).toContain("You have unpublished changes from 5 minutes ago. Restore them?");
    expect(html).toContain(">Restore<");
    expect(html).toContain(">Discard<");
    expect(html).not.toContain("site changed");
  });

  it("warns when the site changed since the draft was saved", () => {
    const html = renderToStaticMarkup(
      <RestorePrompt savedAt="2026-10-21T11:55:00.000Z" now={now} siteChanged onRestore={noop} onDiscard={noop} />,
    );

    expect(html).toContain("The site changed since this draft was saved");
    expect(html).toContain("review carefully");
  });

  it("says a rebased restore applies only the draft's edits and lists the conflicts", () => {
    const html = renderToStaticMarkup(
      <RestorePrompt
        savedAt="2026-10-21T11:55:00.000Z"
        now={now}
        siteChanged
        rebased
        conflicts={["site.heroFacts.experience", "en:portfolio.profile.title"]}
        onRestore={noop}
        onDiscard={noop}
      />,
    );

    expect(html).toContain("Restore applies only your edits on top of it.");
    expect(html).toContain("your version is kept");
    expect(html).toContain("site.heroFacts.experience");
    expect(html).toContain("en:portfolio.profile.title");
  });
});

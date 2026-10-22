import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => (cookieJar.value === undefined ? undefined : { value: cookieJar.value }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}));
// The client-name guard runs on an invented name here, so this public file names no client.
vi.mock("@/lib/content/client-names", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content/client-names")>();
  const list = [actual.clientNameHash("Acme Rival Foods")];
  return {
    ...actual,
    checkClientNames: (...args: Parameters<typeof actual.checkClientNames>) => actual.checkClientNames(args[0], args[1], list),
    checkClientNamesInPaths: (paths: readonly string[]) => actual.checkClientNamesInPaths(paths, list),
  };
});

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import { saveDraft, searchIcons } from "@/app/admin/actions";
import { stubGitHub } from "@/test/github-stub";
import { getAllMessages } from "@/i18n/messages";
import { getContentFiles } from "@/lib/content/load";
import type { ContentFiles } from "@/lib/content/schema";

import { readAdminConfig, type AdminConfig } from "./config";
import {
  appendItem,
  checkDraft,
  contentFilePath,
  leafPaths,
  referencedMedia,
  removeItem,
  serializeJson,
  updateLeaf,
  type ContentDraft,
  type MessageDraft,
  type MessageNode,
} from "./draft";
import { createSessionToken, credentialsMatch, isSessionValid } from "./session";

const ENV = {
  ADMIN_EMAIL: "editor@example.com",
  ADMIN_PASSWORD: "correct horse battery staple",
  ADMIN_SESSION_SECRET: "session-secret",
  GITHUB_TOKEN: "github-token",
  GITHUB_REPO: "owner/repo",
};

const CONFIG = readAdminConfig(ENV) as AdminConfig;

function messageReference(): MessageDraft {
  return {
    en: {
      common: { labels: { greeting: "Hi {name}" }, tags: ["first", "second"] },
      portfolio: { profile: { title: "Engineer" } },
      projects: { selected: [{ role: "Lead" }] },
    },
    id: {
      common: { labels: { greeting: "Hai {name}" }, tags: ["pertama", "kedua"] },
      portfolio: { profile: { title: "Insinyur" } },
      projects: { selected: [{ role: "Ketua" }] },
    },
  };
}

describe("admin config", () => {
  it("returns null when any variable is missing so /admin can fail closed", () => {
    for (const key of Object.keys(ENV)) {
      expect(readAdminConfig({ ...ENV, [key]: undefined })).toBeNull();
    }
  });

  it("defaults the branch to main", () => {
    expect(CONFIG.branch).toBe("main");
    expect(readAdminConfig({ ...ENV, GITHUB_BRANCH: "preview" })?.branch).toBe("preview");
  });
});

describe("admin session", () => {
  it("accepts its own token and rejects one signed with another secret", () => {
    const token = createSessionToken(CONFIG.sessionSecret, Date.now() + 1000);

    expect(isSessionValid(token, CONFIG.sessionSecret)).toBe(true);
    expect(isSessionValid(token, "another-secret")).toBe(false);
  });

  it("rejects an expiry edited past the signature", () => {
    const expiresAt = Date.now() + 1000;
    const token = createSessionToken(CONFIG.sessionSecret, expiresAt);
    const forged = token.replace(String(expiresAt), String(expiresAt + 86_400_000));

    expect(isSessionValid(forged, CONFIG.sessionSecret)).toBe(false);
  });

  it("rejects an expired, malformed, or absent token", () => {
    const expiresAt = Date.now() + 1000;
    const token = createSessionToken(CONFIG.sessionSecret, expiresAt);

    expect(isSessionValid(token, CONFIG.sessionSecret, expiresAt + 1)).toBe(false);
    expect(isSessionValid("nonsense", CONFIG.sessionSecret)).toBe(false);
    expect(isSessionValid(undefined, CONFIG.sessionSecret)).toBe(false);
  });

  it("matches the configured credentials and nothing else", () => {
    expect(
      credentialsMatch({ email: " Editor@Example.com ", password: ENV.ADMIN_PASSWORD }, CONFIG),
    ).toBe(true);
    expect(credentialsMatch({ email: ENV.ADMIN_EMAIL, password: "wrong" }, CONFIG)).toBe(false);
    expect(
      credentialsMatch({ email: "someone@example.com", password: ENV.ADMIN_PASSWORD }, CONFIG),
    ).toBe(false);
  });
});

describe("draft editing", () => {
  it("names leaves the way the i18n parity test does", () => {
    expect(leafPaths(messageReference().en.common)).toEqual(["labels.greeting", "tags[0]", "tags[1]"]);
  });

  it("replaces one leaf without touching its siblings", () => {
    const edited = updateLeaf(messageReference().en.common, ["tags", 1], "changed");

    expect(edited).toEqual({ labels: { greeting: "Hi {name}" }, tags: ["first", "changed"] });
  });

  it("keeps both languages structurally identical across add and remove", () => {
    const draft = messageReference();
    const withItem: MessageDraft = {
      en: { ...draft.en, common: appendItem(draft.en.common, ["tags"]) },
      id: { ...draft.id, common: appendItem(draft.id.common, ["tags"]) },
    };

    expect(leafPaths(withItem.en.common)).toEqual(leafPaths(withItem.id.common));
    expect(withItem.en.common).toEqual({
      labels: { greeting: "Hi {name}" },
      tags: ["first", "second", ""],
    });

    const withoutItem: MessageDraft = {
      en: { ...withItem.en, common: removeItem(withItem.en.common, ["tags"], 0) },
      id: { ...withItem.id, common: removeItem(withItem.id.common, ["tags"], 0) },
    };

    expect(leafPaths(withoutItem.en.common)).toEqual(leafPaths(withoutItem.id.common));
  });

  it("copies the shape of a nested item when adding to an array of objects", () => {
    const grown = appendItem(messageReference().en.projects, ["selected"]);

    expect(grown).toEqual({ selected: [{ role: "Lead" }, { role: "" }] });
  });

  it("writes the two-space JSON the repo already uses", () => {
    expect(serializeJson({ a: "b" })).toBe('{\n  "a": "b"\n}\n');
  });

  it("names each content file's path in the repository", () => {
    expect(contentFilePath("site")).toBe("client/content/site.json");
  });
});

const clone = <T>(value: T): T => structuredClone(value);

function reference(): ContentDraft {
  return {
    content: clone(getContentFiles()),
    messages: clone(getAllMessages()) as unknown as MessageDraft,
    media: [],
  };
}

// Everything the repository's own content points at exists on the branch.
function publicFiles(): string[] {
  return referencedMedia(getContentFiles());
}

type Loose = Record<string, any>;

function withTestimonial(base: ContentDraft, id: string): ContentDraft {
  const draft = clone(base);
  draft.content.portfolio.testimonials.push({ id, name: "Jane Doe", company: "Acme" });

  for (const locale of ["en", "id"] as const) {
    (draft.messages[locale].portfolio as Loose).testimonials[id] = {
      quote: locale === "en" ? "Great to work with." : "Menyenangkan diajak kerja sama.",
      role: locale === "en" ? "Director" : "Direktur",
    };
  }

  return draft;
}

const BLOB_SHA = "0123456789abcdef0123456789abcdef01234567";

function withMedia(base: ContentDraft, media: Partial<ContentDraft["media"][number]>): ContentDraft {
  const draft = clone(base);
  draft.media.push({
    kind: "image",
    repoPath: "client/public/media/2026/a-1234abcd.webp",
    publicPath: "/media/2026/a-1234abcd.webp",
    sha: BLOB_SHA,
    ...media,
  });

  return draft;
}

function issuesOf(candidate: unknown, base = reference()) {
  const result = checkDraft(candidate, base, publicFiles());

  return result.ok ? [] : result.issues;
}

describe("draft validation of client names", () => {
  it("refuses a publish whose copy, facts, or upload path names a client", () => {
    const draft = clone(reference());
    const slug = draft.content.projects.selected[0].slug;
    (draft.messages.id.projects as { selected: Record<string, { outcome: string }> }).selected[slug].outcome =
      "Dibuat untuk tim ACME RIVAL FOODS.";
    draft.content.projects.selected[0].name = "Acme-Rival Foods Console";
    const withUpload = withMedia(draft, {
      repoPath: "client/public/media/2026/acme-rival-foods-1234abcd.webp",
      publicPath: "/media/2026/acme-rival-foods-1234abcd.webp",
    });

    const issues = issuesOf(withUpload);

    expect(issues).toContainEqual(
      expect.objectContaining({ file: "messages", path: `id.projects.selected.${slug}.outcome`, message: expect.stringContaining("Names a client") }),
    );
    expect(issues).toContainEqual(expect.objectContaining({ file: "projects", path: "selected[0].name" }));
    expect(issues).toContainEqual(expect.objectContaining({ file: "media", path: "/media/2026/acme-rival-foods-1234abcd.webp" }));
  });

  it("lets the repository's own content through, employers included", () => {
    expect(issuesOf(reference()).filter((issue) => issue.message.includes("client"))).toEqual([]);
  });
});

describe("draft validation", () => {
  it("accepts the repository's own files unchanged", () => {
    expect(checkDraft(reference(), reference(), publicFiles()).ok).toBe(true);
  });

  it("accepts a first testimonial with facts and copy in both languages", () => {
    expect(getContentFiles().portfolio.testimonials).toEqual([]);
    expect(checkDraft(withTestimonial(reference(), "jane-doe"), reference(), publicFiles()).ok).toBe(
      true,
    );
  });

  it("accepts an ordinary copy edit", () => {
    const draft = reference();
    (draft.messages.en.portfolio as Loose).profile.title = "Full-Stack Engineer";
    (draft.messages.id.portfolio as Loose).profile.title = "Insinyur Full-Stack";

    expect(checkDraft(draft, reference(), publicFiles()).ok).toBe(true);
  });

  it("hands back the draft in the key order it arrived in", () => {
    const result = checkDraft(reference(), reference(), publicFiles());

    expect(result.ok && serializeJson(result.value.content.site)).toBe(
      serializeJson(getContentFiles().site),
    );
  });

  it("rejects a new message key outside a collection", () => {
    const draft = reference();
    (draft.messages.en.common as Loose).actions.hack = "x";

    expect(issuesOf(draft)).toContainEqual(expect.objectContaining({ file: "messages" }));
  });

  it("rejects a message value that is not text, a list, or a group", () => {
    const draft = reference();
    (draft.messages.en.common as Loose).actions = 7;

    expect(issuesOf(draft)).toContainEqual(expect.objectContaining({ file: "messages" }));
  });

  it("rejects a missing locale or a candidate that is not an object", () => {
    expect(issuesOf("not an object").length).toBeGreaterThan(0);
    expect(issuesOf({ ...reference(), messages: { en: reference().messages.en } }).length).toBeGreaterThan(0);
  });

  it("rejects a blank field and a placeholder that survives in one language", () => {
    const blank = reference();
    (blank.messages.id.portfolio as Loose).profile.title = " ";
    expect(issuesOf(blank)).toContainEqual(
      expect.objectContaining({ file: "messages", path: "id.portfolio.profile.title" }),
    );

    const placeholder = reference();
    (placeholder.messages.id.common as Loose).labels.siteMetadataTitle = "Tanpa placeholder";
    expect(issuesOf(placeholder).length).toBeGreaterThan(0);
  });

  it("rejects content that breaks a content rule, naming the file", () => {
    const draft = reference();
    draft.content.portfolio.experiences[0].id = draft.content.portfolio.experiences[1].id;

    expect(issuesOf(draft)).toContainEqual(expect.objectContaining({ file: "portfolio" }));
  });

  it("rejects a collection entry whose copy has the wrong shape", () => {
    const draft = withTestimonial(reference(), "jane-doe");
    (draft.messages.en.portfolio as Loose).testimonials["jane-doe"].role = ["Director"];

    expect(issuesOf(draft)).toContainEqual(
      expect.objectContaining({ path: "en.portfolio.testimonials.jane-doe.role" }),
    );
  });

  it("rejects an image path that exists nowhere", () => {
    const draft = reference();
    draft.content.site.profile.portrait.src = "/media/missing.webp";

    expect(issuesOf(draft)).toContainEqual(
      expect.objectContaining({ file: "site", path: "profile.portrait.src" }),
    );
  });

  it("accepts an image path that is pending upload", () => {
    const draft = withMedia(reference(), {});
    draft.content.site.profile.portrait.src = "/media/2026/a-1234abcd.webp";

    expect(checkDraft(draft, reference(), publicFiles()).ok).toBe(true);
  });

  it("rejects pending media aimed outside the media folder", () => {
    const draft = withMedia(reference(), {
      repoPath: "client/src/app/page.tsx",
      publicPath: "/src/app/page.tsx",
    });

    expect(issuesOf(draft)).toContainEqual(expect.objectContaining({ path: "media[0].repoPath" }));
  });

  it("rejects pending media that climbs out of the media folder", () => {
    const draft = withMedia(reference(), { repoPath: "client/public/media/../../src/x.webp" });

    expect(issuesOf(draft)).toContainEqual(expect.objectContaining({ path: "media[0].repoPath" }));
  });

  it("accepts a .jpg image upload and still rejects .png and .svg", () => {
    const at = (name: string) =>
      withMedia(reference(), {
        repoPath: `client/public/media/2026/${name}`,
        publicPath: `/media/2026/${name}`,
      });

    expect(issuesOf(at("a-1234abcd.jpg"))).not.toContainEqual(
      expect.objectContaining({ path: "media[0].repoPath" }),
    );

    for (const name of ["a.png", "a.svg", "a.avif"]) {
      expect(issuesOf(at(name))).toContainEqual(expect.objectContaining({ path: "media[0].repoPath" }));
    }
  });

  it("allows pending media only at the CV path outside the media folder", () => {
    const resume = reference().content.site.profile.resumePath;
    const draft = withMedia(reference(), {
      kind: "resume",
      repoPath: `client/public${resume}`,
      publicPath: resume,
    });

    expect(checkDraft(draft, reference(), publicFiles()).ok).toBe(true);
  });

  it.each(["constructor", "toString", "__proto__"])(
    "rejects an inherited name like %s as a new key outside a collection, in both locales",
    (name) => {
      for (const locale of ["en", "id"] as const) {
        const draft = reference();
        const actions = (draft.messages[locale].common as Loose).actions;
        Object.defineProperty(actions, name, { value: "x", enumerable: true, configurable: true, writable: true });
        const parsed = JSON.parse(JSON.stringify(draft));
        Object.defineProperty(parsed.messages[locale].common.actions, name, {
          value: "x",
          enumerable: true,
          configurable: true,
          writable: true,
        });

        expect(issuesOf(parsed)).toContainEqual(
          expect.objectContaining({ path: `${locale}.common.actions.${name}` }),
        );
      }
    },
  );

  it("rejects a CV upload that is not a PDF and a path uploaded twice", () => {
    const resume = reference().content.site.profile.resumePath;
    const notPdf = withMedia(reference(), {
      kind: "resume",
      repoPath: "client/public/media/cv.webp",
      publicPath: "/media/cv.webp",
    });
    expect(issuesOf(notPdf)).toContainEqual(expect.objectContaining({ file: "media", path: "media[0].repoPath" }));

    const twice = withMedia(withMedia(reference(), {}), {});
    expect(issuesOf(twice)).toContainEqual(expect.objectContaining({ file: "media", path: "media[1].repoPath" }));
    expect(resume.endsWith(".pdf")).toBe(true);
  });

  it.each(["blobsha", "", "0123456789ABCDEF0123456789ABCDEF01234567", `${"a".repeat(40)}\n`, "a".repeat(64)])(
    "rejects a pending upload whose blob sha is %j",
    (sha) => {
      expect(issuesOf(withMedia(reference(), { sha }))).toContainEqual(
        expect.objectContaining({ file: "media", path: "media[0]" }),
      );
    },
  );

  it("pins the CV path to the repository's", () => {
    const draft = reference();
    draft.content.site.profile.resumePath = "/other.pdf";

    expect(issuesOf(draft)).toContainEqual(expect.objectContaining({ file: "site", path: "profile.resumePath" }));

    const moved = withMedia(draft, { kind: "resume", repoPath: "client/public/other.pdf", publicPath: "/other.pdf" });
    expect(issuesOf(moved)).toContainEqual(expect.objectContaining({ file: "site", path: "profile.resumePath" }));
  });

  it("lists every src plus the CV as referenced media", () => {
    const content: ContentFiles = getContentFiles();
    const media = referencedMedia(content);

    expect(media).toContain(content.site.profile.resumePath);
    expect(media).toContain(content.site.profile.portrait.src);
    content.projects.selected.forEach((app) =>
      app.screenshots.forEach((shot) => expect(media).toContain(shot.src)),
    );
    content.projects.archive.forEach((project) => expect(media).toContain(project.cover.src));
  });
});

describe("saveDraft", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    cookieJar.value = undefined;
  });

  it("answers signed-out instead of throwing without a session", async () => {
    vi.stubEnv("ADMIN_EMAIL", ENV.ADMIN_EMAIL);
    vi.stubEnv("ADMIN_PASSWORD", ENV.ADMIN_PASSWORD);
    vi.stubEnv("ADMIN_SESSION_SECRET", ENV.ADMIN_SESSION_SECRET);
    vi.stubEnv("GITHUB_TOKEN", ENV.GITHUB_TOKEN);
    vi.stubEnv("GITHUB_REPO", ENV.GITHUB_REPO);

    await expect(saveDraft(reference(), "base")).resolves.toMatchObject({
      ok: false,
      reason: "signed-out",
    });
  });

  it("answers with an error when the editor is not configured", async () => {
    await expect(saveDraft(reference(), "base")).resolves.toMatchObject({
      ok: false,
      reason: "error",
    });
  });

  describe("with a signed-in session", () => {
    beforeEach(() => {
      for (const [key, value] of Object.entries(ENV)) {
        vi.stubEnv(key, value);
      }

      cookieJar.value = createSessionToken(ENV.ADMIN_SESSION_SECRET, Date.now() + 60_000);
    });

    afterEach(() => vi.unstubAllGlobals());

    it("commits one changed file and nothing else", async () => {
      const calls = stubGitHub({ head: "base" });
      const draft = reference();
      draft.content.site.heroFacts.experience = "9 years";

      const result = await saveDraft(draft, "base");

      expect(result).toEqual({
        ok: true,
        commitSha: "newcommit",
        commitUrl: "https://github.com/owner/repo/commit/newcommit",
      });
      expect(calls.tree?.tree.map((entry) => entry.path)).toEqual(["client/content/site.json"]);
      expect(calls.commit?.message).toBe("content: update hero");
    });

    it("drops pending media the draft no longer references", async () => {
      const calls = stubGitHub({ head: "base" });
      const draft = withMedia(reference(), {});
      draft.content.site.heroFacts.experience = "9 years";

      await saveDraft(draft, "base");

      expect(calls.tree?.tree.map((entry) => entry.path)).toEqual(["client/content/site.json"]);
    });

    it("commits pending media the draft references as a blob", async () => {
      const calls = stubGitHub({ head: "base" });
      const draft = withMedia(reference(), {});
      draft.content.site.profile.portrait.src = "/media/2026/a-1234abcd.webp";

      await saveDraft(draft, "base");

      expect(calls.tree?.tree).toContainEqual(
        expect.objectContaining({ path: "client/public/media/2026/a-1234abcd.webp", sha: BLOB_SHA }),
      );
    });

    it("reports a no-op save as nothing to publish and makes no commit", async () => {
      const calls = stubGitHub({ head: "base" });

      await expect(saveDraft(reference(), "base")).resolves.toEqual({
        ok: false,
        reason: "error",
        message: "Nothing to publish.",
      });
      expect(calls.commit).toBeUndefined();
    });

    it("rejects an invalid draft with its issues before any commit", async () => {
      const calls = stubGitHub({ head: "base" });
      const draft = reference();
      draft.content.portfolio.experiences[0].id = draft.content.portfolio.experiences[1].id;

      const result = await saveDraft(draft, "base");

      expect(result).toMatchObject({ ok: false, reason: "invalid" });
      expect(calls.commit).toBeUndefined();
    });

    it("answers conflict when the branch moved since the editor loaded", async () => {
      const calls = stubGitHub({ head: "moved" });
      const draft = reference();
      draft.content.site.heroFacts.experience = "9 years";

      await expect(saveDraft(draft, "base")).resolves.toMatchObject({ ok: false, reason: "conflict" });
      expect(calls.commit).toBeUndefined();
    });

    it("answers conflict when GitHub refuses the ref update", async () => {
      stubGitHub({ head: "base", refUpdateStatus: 422 });
      const draft = reference();
      draft.content.site.heroFacts.experience = "9 years";

      await expect(saveDraft(draft, "base")).resolves.toMatchObject({ ok: false, reason: "conflict" });
    });
  });
});

describe("searchIcons", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    cookieJar.value = undefined;
  });

  function signIn() {
    for (const [key, value] of Object.entries(ENV)) {
      vi.stubEnv(key, value);
    }

    cookieJar.value = createSessionToken(ENV.ADMIN_SESSION_SECRET, Date.now() + 60_000);
  }

  it("returns nothing without a session", async () => {
    for (const [key, value] of Object.entries(ENV)) {
      vi.stubEnv(key, value);
    }

    await expect(searchIcons("next")).resolves.toEqual([]);
  });

  it("returns nothing when the editor is not configured", async () => {
    await expect(searchIcons("next")).resolves.toEqual([]);
  });

  it("finds Next.js first for a signed-in editor", async () => {
    signIn();
    const results = await searchIcons(" next ");

    expect(results[0]).toMatchObject({ slug: "nextdotjs", title: "Next.js" });
    expect(results[0].path).toMatch(/^M/);
    expect(results.length).toBeLessThanOrEqual(24);
  });

  it("returns nothing for an empty or over-long query", async () => {
    signIn();

    await expect(searchIcons("")).resolves.toEqual([]);
    await expect(searchIcons("   ")).resolves.toEqual([]);
    await expect(searchIcons("a".repeat(41))).resolves.toEqual([]);
  });

  it("caps results at 24", async () => {
    signIn();

    expect((await searchIcons("a")).length).toBe(24);
  });
});

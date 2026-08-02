import { describe, expect, it } from "vitest";

import { readAdminConfig, type AdminConfig } from "./config";
import {
  appendItem,
  checkDraft,
  leafPaths,
  removeItem,
  serializeMessages,
  updateLeaf,
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

function reference(): MessageDraft {
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
    expect(leafPaths(reference().en.common)).toEqual(["labels.greeting", "tags[0]", "tags[1]"]);
  });

  it("replaces one leaf without touching its siblings", () => {
    const edited = updateLeaf(reference().en.common, ["tags", 1], "changed");

    expect(edited).toEqual({ labels: { greeting: "Hi {name}" }, tags: ["first", "changed"] });
  });

  it("keeps both languages structurally identical across add and remove", () => {
    const draft = reference();
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
    const grown = appendItem(reference().en.projects, ["selected"]);

    expect(grown).toEqual({ selected: [{ role: "Lead" }, { role: "" }] });
  });

  it("writes the two-space JSON the repo already uses", () => {
    expect(serializeMessages({ a: "b" })).toBe('{\n  "a": "b"\n}\n');
  });
});

describe("draft validation", () => {
  it("accepts an ordinary copy edit", () => {
    const draft = reference();
    draft.en.portfolio = { profile: { title: "Full-Stack Engineer" } };

    expect(checkDraft(draft, reference()).ok).toBe(true);
  });

  it("rejects a blank field in either language", () => {
    const english = reference();
    english.en.portfolio = { profile: { title: "   " } };
    expect(checkDraft(english, reference())).toMatchObject({ ok: false });

    const indonesian = reference();
    indonesian.id.portfolio = { profile: { title: "" } };
    expect(checkDraft(indonesian, reference())).toMatchObject({ ok: false });
  });

  it("rejects a placeholder that survives in only one language", () => {
    const draft = reference();
    draft.id.common = { labels: { greeting: "Hai kamu" }, tags: ["pertama", "kedua"] };

    const result = checkDraft(draft, reference());

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("placeholders");
  });

  it("rejects arrays that stop matching between languages", () => {
    const draft = reference();
    draft.en.common = { labels: { greeting: "Hi {name}" }, tags: ["first", "second", "third"] };

    expect(checkDraft(draft, reference())).toMatchObject({ ok: false });
  });

  it("rejects keys, types, and catalogues the editor could never produce", () => {
    const withNewKey = reference();
    (withNewKey.en.portfolio as Record<string, MessageNode>).injected = "surprise";
    expect(checkDraft(withNewKey, reference())).toMatchObject({ ok: false });

    const withNumber = reference();
    withNumber.en.portfolio = { profile: { title: 7 } } as unknown as MessageNode;
    expect(checkDraft(withNumber, reference())).toMatchObject({ ok: false });

    expect(checkDraft({ en: reference().en }, reference())).toMatchObject({ ok: false });
    expect(checkDraft("not an object", reference())).toMatchObject({ ok: false });
  });

  it("allows an added item once both languages fill it in", () => {
    const draft = reference();
    draft.en.common = { labels: { greeting: "Hi {name}" }, tags: ["first", "second", "third"] };
    draft.id.common = { labels: { greeting: "Hai {name}" }, tags: ["pertama", "kedua", "ketiga"] };

    expect(checkDraft(draft, reference()).ok).toBe(true);
  });
});

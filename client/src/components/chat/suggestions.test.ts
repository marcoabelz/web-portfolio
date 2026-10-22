import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MAX_MESSAGE_LENGTH } from "@/lib/chat/validate";
import { SUGGESTED_QUESTIONS, showSuggestions } from "./suggestions";

describe("SUGGESTED_QUESTIONS", () => {
  it("has exactly three nonblank questions within the message length limit", () => {
    expect(SUGGESTED_QUESTIONS).toHaveLength(3);
    for (const question of SUGGESTED_QUESTIONS) {
      expect(question.trim()).not.toBe("");
      expect(question.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    }
  });
});

describe("showSuggestions", () => {
  it("shows only before the first message, with nothing pending and the cap not reached", () => {
    expect(showSuggestions({ messageCount: 0, pending: false, capReached: false })).toBe(true);
    expect(showSuggestions({ messageCount: 1, pending: false, capReached: false })).toBe(false);
    expect(showSuggestions({ messageCount: 0, pending: true, capReached: false })).toBe(false);
    expect(showSuggestions({ messageCount: 0, pending: false, capReached: true })).toBe(false);
  });
});

describe("ChatWidget", () => {
  it("renders the suggestions through the shared module", () => {
    const source = readFileSync(join(process.cwd(), "src/components/chat/ChatWidget.tsx"), "utf8");
    expect(source).toMatch(/import\s*\{[^}]*SUGGESTED_QUESTIONS[^}]*\}\s*from "\.\/suggestions"/);
    expect(source).toMatch(/import\s*\{[^}]*showSuggestions[^}]*\}\s*from "\.\/suggestions"/);
  });
});

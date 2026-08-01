import { describe, expect, it } from "vitest";

import {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_LENGTH,
  parseChatRequest,
} from "@/lib/chat/validate";

const ok = (body: unknown) => {
  const result = parseChatRequest(body);

  if (!result.ok) throw new Error(`expected success, got: ${result.error}`);

  return result.value;
};

describe("parseChatRequest", () => {
  it("accepts a valid body and trims the message", () => {
    expect(ok({ message: "  Who is Marco?  " })).toEqual({
      message: "Who is Marco?",
      history: [],
    });
  });

  it("rejects non-object bodies", () => {
    expect(parseChatRequest(null).ok).toBe(false);
    expect(parseChatRequest("hello").ok).toBe(false);
    expect(parseChatRequest(42).ok).toBe(false);
  });

  it("rejects a missing, non-string, or empty message", () => {
    expect(parseChatRequest({}).ok).toBe(false);
    expect(parseChatRequest({ message: 123 }).ok).toBe(false);
    expect(parseChatRequest({ message: "   " }).ok).toBe(false);
  });

  it("rejects a message longer than the cap", () => {
    expect(parseChatRequest({ message: "a".repeat(MAX_MESSAGE_LENGTH) }).ok).toBe(true);
    expect(parseChatRequest({ message: "a".repeat(MAX_MESSAGE_LENGTH + 1) }).ok).toBe(false);
  });

  it("rejects a history that is not an array", () => {
    expect(parseChatRequest({ message: "hi", history: "nope" }).ok).toBe(false);
  });

  it("keeps only the last N history messages", () => {
    const history = Array.from({ length: MAX_HISTORY_MESSAGES + 10 }, (_, index) => ({
      role: "user" as const,
      text: `message ${index}`,
    }));

    const value = ok({ message: "hi", history });

    expect(value.history).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(value.history[0].text).toBe("message 10");
  });

  it("drops malformed history entries", () => {
    const value = ok({
      message: "hi",
      history: [
        { role: "user", text: "kept" },
        { role: "system", text: "wrong role" },
        { role: "model", text: "" },
        { role: "model" },
        "not an object",
        null,
      ],
    });

    expect(value.history).toEqual([{ role: "user", text: "kept" }]);
  });

  it("truncates oversized history entries instead of trusting the client", () => {
    const value = ok({
      message: "hi",
      history: [{ role: "user", text: "a".repeat(50_000) }],
    });

    expect(value.history[0].text).toHaveLength(MAX_MESSAGE_LENGTH);
  });
});

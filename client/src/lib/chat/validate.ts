import type { ChatMessage } from "@/types/chat";

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_HISTORY_MESSAGES = 20;

export type ChatRequest = {
  message: string;
  history: ChatMessage[];
};

export type ParseResult =
  | { ok: true; value: ChatRequest }
  | { ok: false; error: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;

  const { role, text } = value as { role?: unknown; text?: unknown };

  return (role === "user" || role === "model") && typeof text === "string" && text.trim() !== "";
}

export function parseChatRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object." };
  }

  const { message, history } = body as { message?: unknown; history?: unknown };

  if (typeof message !== "string") {
    return { ok: false, error: "Field 'message' must be a string." };
  }

  const trimmed = message.trim();

  if (trimmed === "") {
    return { ok: false, error: "Field 'message' must not be empty." };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Field 'message' must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  let rawHistory: unknown[] = [];

  if (history !== undefined) {
    if (!Array.isArray(history)) {
      return { ok: false, error: "Field 'history' must be an array." };
    }

    rawHistory = history;
  }

  const cleanHistory = rawHistory
    .filter(isChatMessage)
    .slice(-MAX_HISTORY_MESSAGES)
    .map(({ role, text }) => ({ role, text: text.slice(0, MAX_MESSAGE_LENGTH) }));

  return { ok: true, value: { message: trimmed, history: cleanHistory } };
}

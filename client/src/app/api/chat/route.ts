import { NextResponse } from "next/server";

import { generateReply, type GeminiTurn } from "@/lib/chat/gemini";
import { stripDelimiters, SYSTEM_INSTRUCTION, wrapUserMessage } from "@/lib/chat/prompt";
import { checkRateLimit } from "@/lib/chat/rate-limit";
import { parseChatRequest } from "@/lib/chat/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Chat is not configured." }, { status: 503 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseChatRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!checkRateLimit(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a minute before asking again." },
      { status: 429 },
    );
  }

  // History comes from the request body, so it is untrusted the same way `message` is.
  // Forged "model" turns or raw </user_message> tags in history could otherwise fake an
  // assistant concession or break out of the trust boundary Task 3's delimiters establish.
  const contents: GeminiTurn[] = [
    ...parsed.value.history.map((entry) => ({
      role: entry.role,
      parts: [
        { text: entry.role === "user" ? wrapUserMessage(entry.text) : stripDelimiters(entry.text) },
      ],
    })),
    { role: "user", parts: [{ text: wrapUserMessage(parsed.value.message) }] },
  ];

  try {
    const reply = await generateReply(apiKey, SYSTEM_INSTRUCTION, contents);

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}

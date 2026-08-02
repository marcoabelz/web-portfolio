const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const MAX_OUTPUT_TOKENS = 500;

const REQUEST_TIMEOUT_MS = 20_000;

export type GeminiTurn = {
  role: "user" | "model";
  parts: { text: string }[];
};

function extractText(payload: unknown): string {
  const candidate = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0];

  return (candidate?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

// ponytail: no thinkingConfig. Verified live against gemini-3.5-flash-lite — responses carry no
// thoughtsTokenCount, so the model does not think by default and there is nothing to switch off.
// The 2.5-era thinkingBudget: 0 is rejected by the 3.x API with HTTP 400.
export async function generateReply(
  apiKey: string,
  systemInstruction: string,
  contents: GeminiTurn[],
): Promise<string> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const text = extractText(await response.json());

  if (text === "") {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

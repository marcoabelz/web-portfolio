// Starter questions shown in an empty chat. Chat chrome is English on both locales (see
// the ChatWidget known limitation), so these are too.
export const SUGGESTED_QUESTIONS = [
  "What has Abel built with AI?",
  "Is Abel open to freelance projects?",
  "What's Abel's main tech stack?",
] as const;

// Offered only while the chat is untouched: once a message exists, is in flight, or the
// session cap is hit, the chips would be noise or a way around the cap.
export function showSuggestions(state: {
  messageCount: number;
  pending: boolean;
  capReached: boolean;
}): boolean {
  return state.messageCount === 0 && !state.pending && !state.capReached;
}

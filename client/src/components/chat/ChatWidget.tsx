"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";

import { MAX_MESSAGE_LENGTH } from "@/lib/chat/validate";
import { PHONE_QUERY, trapTarget } from "./focus-trap";
import { SUGGESTED_QUESTIONS, showSuggestions } from "./suggestions";
import type { ChatMessage } from "@/types/chat";

const SESSION_MESSAGE_CAP = 20;
const GREETING = "Ask me anything about Abel's experience, projects, or skills.";
const HINT_TEXT = "Ask about Abel — click here";
const HINT_TYPING_MS = 45;
// The countdown starts once the last character lands, so the hold is reading time.
// Starting it at mount would spend a quarter of the window on the animation itself.
const HINT_HOLD_MS = 5000;

// The visitor's bubble sits right and filled, the assistant's left and outlined, so the
// two sides stay distinguishable by position and weight, not by colour alone.
const BUBBLE_BASE = "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-base md:text-[15px] md:leading-6";
const USER_BUBBLE = `${BUBBLE_BASE} ml-auto rounded-br-sm bg-accent text-canvas`;
// Text colour is appended per bubble rather than shared: two colour utilities on one
// element are decided by CSS source order, not by the order they appear in className.
const MODEL_BUBBLE_BASE = `${BUBBLE_BASE} mr-auto rounded-bl-sm border border-line bg-elevated`;
const MODEL_BUBBLE = `${MODEL_BUBBLE_BASE} text-ink`;
// Three shimmering lines stand in for the reply; the visually hidden label keeps the
// pending state announced, since the lines carry no text.
const THINKING_BUBBLE = `${MODEL_BUBBLE_BASE} w-[min(15rem,85%)] space-y-2`;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [typedLength, setTypedLength] = useState(0);
  const [sheet, setSheet] = useState<{ top: number; height: number } | null>(null);
  const [isPhone, setIsPhone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const askedCount = messages.filter((message) => message.role === "user").length;
  const capReached = askedCount >= SESSION_MESSAGE_CAP;

  // Phone or desktop is re-read on every change of the media query, so rotating a
  // tablet across the breakpoint switches the sheet, the scroll lock, and the modal
  // semantics without reopening the panel.
  useEffect(() => {
    const phone = window.matchMedia(PHONE_QUERY);
    const update = () => setIsPhone(phone.matches);

    update();
    phone.addEventListener("change", update);
    return () => phone.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // Focusing the input on a phone raises the keyboard before the visitor has read
    // anything, so the sheet's own close button takes focus instead: focus still moves
    // into the dialog, and the keyboard waits until the visitor taps the input.
    if (window.matchMedia(PHONE_QUERY).matches) closeRef.current?.focus();
    else inputRef.current?.focus();
  }, [isOpen]);

  // On a phone the sheet follows the visual viewport: 100dvh does not shrink when the
  // on-screen keyboard opens, so a dvh-sized sheet leaves the input underneath it.
  useEffect(() => {
    if (!isOpen || !isPhone) return;

    const viewport = window.visualViewport;

    if (!viewport) return;

    const update = () => {
      setSheet({ top: viewport.offsetTop + 8, height: Math.max(viewport.height - 16, 0) });
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setSheet(null);
    };
  }, [isOpen, isPhone]);

  // Motion is the whole point of the hint, so anyone who asked for less of it gets the
  // finished sentence instead of a moving one.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedLength(HINT_TEXT.length);
    }
  }, []);

  // One self-rescheduling timeout per character rather than an interval: the cleanup is
  // a single clearTimeout, and there is no timer left running once the text is complete.
  useEffect(() => {
    if (!showHint || typedLength >= HINT_TEXT.length) return;

    const timer = setTimeout(() => setTypedLength((current) => current + 1), HINT_TYPING_MS);

    return () => clearTimeout(timer);
  }, [showHint, typedLength]);

  // One nudge per page load, then it gets out of the way on its own.
  useEffect(() => {
    if (typedLength < HINT_TEXT.length) return;

    const timer = setTimeout(() => setShowHint(false), HINT_HOLD_MS);

    return () => clearTimeout(timer);
  }, [typedLength]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, isSending, error]);

  // On a phone the panel covers most of the screen, so the page behind it is frozen:
  // scrolling content you cannot see reads as the widget being broken. The blur that
  // goes with it is the backdrop below, hidden at the same breakpoint.
  useEffect(() => {
    if (!isOpen || !isPhone) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isPhone]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // On a phone the sheet is modal (aria-modal), so Tab cycles inside it rather than
      // reaching the page hidden behind it.
      if (event.key === "Tab" && isPhone && panelRef.current) {
        const target = trapTarget(panelRef.current, document.activeElement, event.shiftKey);

        if (target) {
          event.preventDefault();
          target.focus();
        }

        return;
      }

      if (event.key !== "Escape") return;

      setIsOpen(false);
      // The panel that held focus is about to be hidden; without this, focus falls back
      // to <body> and a keyboard user restarts the tab order from the top of the page.
      toggleRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isPhone]);

  const send = async (text: string, history: ChatMessage[]) => {
    setIsSending(true);
    setError(null);
    setFailedMessage(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { reply?: string; error?: string }
        | null;

      if (!response.ok || !payload?.reply) {
        setError(payload?.error ?? "Something went wrong. Please try again.");
        setFailedMessage(text);
        return;
      }

      const reply = payload.reply;

      setMessages((current) => [...current, { role: "model", text: reply }]);
    } catch {
      setError("Network problem. Check your connection and retry.");
      setFailedMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  // The input and the suggestion chips both go through here, so they share the same
  // guards (blank, in flight, session cap) and the same /api/chat validation.
  const submit = (raw: string) => {
    const text = raw.trim();

    if (text === "" || isSending || capReached) return;

    const history = messages;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    void send(text, history);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit(input);
  };

  const handleRetry = () => {
    if (!failedMessage || isSending) return;

    void send(failedMessage, messages.slice(0, -1));
  };

  return (
    <>
      {showHint && !isOpen && (
        <div className="fixed bottom-5 right-[4.5rem] z-50 flex h-11 items-center gap-1 border border-line bg-surface pl-3 pr-1 shadow-editorial md:bottom-8 md:right-[5.25rem]">
          {/* The full sentence sizes the box from the first frame. The panel is anchored
              right, so without a sizer every new character would shove the whole hint
              leftwards instead of typing into place. */}
          <span
            aria-hidden="true"
            className="relative whitespace-nowrap font-mono text-xs uppercase tracking-widest text-muted"
          >
            <span className="invisible">{HINT_TEXT}</span>
            <span className="absolute inset-y-0 left-0 flex items-center">
              {HINT_TEXT.slice(0, typedLength)}
              {typedLength < HINT_TEXT.length && (
                <span className="ml-px animate-pulse text-accent motion-reduce:animate-none">|</span>
              )}
            </span>
          </span>

          {/* The nudge is decorative — the toggle beside it already announces itself — but
              dismissing is a real action, so this button stays reachable while the text
              above does not get spelled out one character at a time. */}
          <button
            type="button"
            onClick={() => setShowHint(false)}
            aria-label="Dismiss chat hint"
            className="inline-flex size-9 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:text-ink motion-reduce:transition-none"
          >
            <X className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      )}

      {isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
          className="fixed inset-0 z-40 bg-canvas/60 backdrop-blur-sm md:hidden"
        />
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => {
          setShowHint(false);
          setIsOpen((current) => !current);
        }}
        aria-label={isOpen ? "Close chat" : "Ask about Abel"}
        aria-expanded={isOpen}
        aria-controls="chat-panel"
        className={`fixed bottom-5 right-5 z-50 inline-flex size-11 items-center justify-center border border-line bg-surface text-ink shadow-lg transition-[opacity,background-color,border-color,color] duration-300 hover:border-accent hover:bg-ink hover:text-canvas hover:opacity-100 focus-visible:border-accent focus-visible:opacity-100 motion-reduce:transition-none md:bottom-8 md:right-8 ${
          isOpen ? "opacity-100" : "opacity-70"
        }`}
      >
        {isOpen ? (
          <X className="size-4" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>

      {/* `flex` is applied only while open: Tailwind's preflight [hidden] rule and the .flex
          utility have equal specificity, and utilities are emitted last, so a permanent
          `flex` class would beat the hidden attribute and pin the panel open.
          The bottom offset clears ScrollToTop (bottom-20 / md:bottom-24, both size-11):
          the panel outranks it on z-index, so any overlap would hide a button that is
          still in the tab order. */}
      <div
        id="chat-panel"
        ref={panelRef}
        role="dialog"
        aria-modal={isOpen && isPhone ? true : undefined}
        aria-label="Ask about Abel"
        hidden={!isOpen}
        style={sheet ? { top: sheet.top, height: sheet.height, bottom: "auto" } : undefined}
        className={`fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 ${isOpen ? "flex" : ""} h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] flex-col border border-line bg-surface shadow-editorial md:inset-x-auto md:bottom-36 md:right-8 md:h-[min(45rem,80vh)] md:max-h-[calc(100dvh-11rem)] md:w-[min(30rem,calc(100vw-4rem))]`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Ask about Abel</p>
          {/* The sheet covers the launcher on a phone, so it carries its own close. */}
          <button
            ref={closeRef}
            type="button"
            onClick={() => {
              setIsOpen(false);
              toggleRef.current?.focus();
            }}
            aria-label="Close chat panel"
            className="-mr-2 inline-flex size-9 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:text-ink md:hidden"
          >
            <X className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-base md:text-[15px]"
        >
          <p className={MODEL_BUBBLE}>{GREETING}</p>

          {showSuggestions({ messageCount: askedCount, pending: isSending, capReached }) && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => submit(question)}
                  className="chip min-h-9 px-3 text-left hover:border-accent focus-visible:border-accent"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {messages.map((message, index) => (
            <p key={index} className={message.role === "user" ? USER_BUBBLE : MODEL_BUBBLE}>
              <span className="sr-only">
                {message.role === "user" ? "You said: " : "Assistant said: "}
              </span>
              {message.text}
            </p>
          ))}

          {isSending && (
            <div role="status" className={THINKING_BUBBLE}>
              <span className="sr-only">Thinking…</span>
              <span aria-hidden="true" className="skeleton h-3 w-full rounded-full" />
              <span aria-hidden="true" className="skeleton h-3 w-5/6 rounded-full" />
              <span aria-hidden="true" className="skeleton h-3 w-2/3 rounded-full" />
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <p role="alert" className="text-muted">
                {error}
              </p>
              {failedMessage && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex min-h-9 items-center gap-2 border border-line px-3 text-xs text-ink transition-colors hover:border-accent focus-visible:border-accent motion-reduce:transition-none"
                >
                  <RotateCcw className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                  Retry
                </button>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <label className="sr-only" htmlFor="chat-input">
            Your question
          </label>
          {/* The input is 16px on a phone: iOS Safari zooms the whole page in when a
              focused field is any smaller, dropping the reader somewhere they did not
              ask to be. It drops back to the panel's own scale from md up. */}
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={capReached}
            placeholder={capReached ? "Message limit reached — reload to reset" : "Type a question…"}
            className="min-h-11 flex-1 bg-transparent px-2 text-base text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed md:text-[15px]"
          />
          <button
            type="submit"
            disabled={isSending || capReached || input.trim() === ""}
            aria-label="Send message"
            className="inline-flex size-9 items-center justify-center border border-line text-ink transition-colors hover:border-accent focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
          >
            <Send className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  );
}

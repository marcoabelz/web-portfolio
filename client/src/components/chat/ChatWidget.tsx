"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";

import { MAX_MESSAGE_LENGTH } from "@/lib/chat/validate";
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
const BUBBLE_BASE = "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm";
const USER_BUBBLE = `${BUBBLE_BASE} ml-auto rounded-br-sm bg-accent text-canvas`;
// Text colour is appended per bubble rather than shared: two colour utilities on one
// element are decided by CSS source order, not by the order they appear in className.
const MODEL_BUBBLE_BASE = `${BUBBLE_BASE} mr-auto rounded-bl-sm border border-line bg-elevated`;
const MODEL_BUBBLE = `${MODEL_BUBBLE_BASE} text-ink`;
const THINKING_BUBBLE = `${MODEL_BUBBLE_BASE} text-muted`;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [typedLength, setTypedLength] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const askedCount = messages.filter((message) => message.role === "user").length;
  const capReached = askedCount >= SESSION_MESSAGE_CAP;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setIsOpen(false);
      // The panel that held focus is about to be hidden; without this, focus falls back
      // to <body> and a keyboard user restarts the tab order from the top of the page.
      toggleRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const text = input.trim();

    if (text === "" || isSending || capReached) return;

    const history = messages;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    void send(text, history);
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
        className="fixed bottom-5 right-5 z-50 inline-flex size-11 items-center justify-center border border-line bg-surface text-ink shadow-lg transition-colors duration-300 hover:border-accent hover:bg-ink hover:text-canvas focus-visible:border-accent motion-reduce:transition-none md:bottom-8 md:right-8"
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
        hidden={!isOpen}
        className={`fixed bottom-32 right-5 z-50 ${isOpen ? "flex" : ""} h-[26rem] max-h-[calc(100vh-9rem)] w-[min(22rem,calc(100vw-2.5rem))] flex-col border border-line bg-surface shadow-editorial md:bottom-36 md:max-h-[calc(100vh-10rem)] md:right-8`}
      >
        <div className="border-b border-line px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Ask about Abel</p>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm"
        >
          <p className={MODEL_BUBBLE}>{GREETING}</p>

          {messages.map((message, index) => (
            <p key={index} className={message.role === "user" ? USER_BUBBLE : MODEL_BUBBLE}>
              <span className="sr-only">
                {message.role === "user" ? "You said: " : "Assistant said: "}
              </span>
              {message.text}
            </p>
          ))}

          {isSending && <p className={THINKING_BUBBLE}>Thinking…</p>}

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

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-2">
          <label className="sr-only" htmlFor="chat-input">
            Your question
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={capReached}
            placeholder={capReached ? "Message limit reached — reload to reset" : "Type a question…"}
            className="min-h-9 flex-1 bg-transparent px-2 text-sm text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed"
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

"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";

import { MAX_MESSAGE_LENGTH } from "@/lib/chat/validate";
import type { ChatMessage } from "@/types/chat";

const SESSION_MESSAGE_CAP = 20;
const GREETING = "Ask me anything about Marco's experience, projects, or skills.";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const askedCount = messages.filter((message) => message.role === "user").length;
  const capReached = askedCount >= SESSION_MESSAGE_CAP;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, isSending, error]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
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
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close chat" : "Ask about Marco"}
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
          `flex` class would beat the hidden attribute and pin the panel open. */}
      <div
        id="chat-panel"
        hidden={!isOpen}
        className={`fixed bottom-20 right-5 z-50 ${isOpen ? "flex" : ""} h-[26rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col border border-line bg-surface shadow-editorial md:bottom-24 md:right-8`}
      >
        <div className="border-b border-line px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Ask about Marco</p>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm"
        >
          <p className="text-muted">{GREETING}</p>

          {messages.map((message, index) => (
            <p
              key={index}
              className={
                message.role === "user"
                  ? "whitespace-pre-wrap text-ink"
                  : "whitespace-pre-wrap border-l-2 border-accent pl-3 text-ink"
              }
            >
              <span className="sr-only">
                {message.role === "user" ? "You said: " : "Assistant said: "}
              </span>
              {message.text}
            </p>
          ))}

          {isSending && <p className="text-muted">Thinking…</p>}

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

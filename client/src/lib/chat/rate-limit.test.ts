import { beforeEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  resetRateLimit,
} from "@/lib/chat/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("allows up to the limit inside one window", () => {
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      expect(checkRateLimit("1.2.3.4", 1_000)).toBe(true);
    }
  });

  it("blocks the request past the limit", () => {
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      checkRateLimit("1.2.3.4", 1_000);
    }

    expect(checkRateLimit("1.2.3.4", 1_000)).toBe(false);
  });

  it("allows again once the window has passed", () => {
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      checkRateLimit("1.2.3.4", 1_000);
    }

    expect(checkRateLimit("1.2.3.4", 1_000 + RATE_LIMIT_WINDOW_MS - 1)).toBe(false);
    expect(checkRateLimit("1.2.3.4", 1_000 + RATE_LIMIT_WINDOW_MS)).toBe(true);
  });

  it("tracks each key independently", () => {
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      checkRateLimit("1.2.3.4", 1_000);
    }

    expect(checkRateLimit("1.2.3.4", 1_000)).toBe(false);
    expect(checkRateLimit("5.6.7.8", 1_000)).toBe(true);
  });

  it("enforces hard ceiling on tracked keys", () => {
    const oldestIp = "0.0.0.0";
    const now = 1_000;

    // Insert the oldest key at its limit
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      checkRateLimit(oldestIp, now);
    }

    // Insert MAX_TRACKED_KEYS distinct IPs to exceed the ceiling and trigger eviction
    for (let i = 0; i < 1000; i += 1) {
      checkRateLimit(`1.0.0.${i}`, now);
    }

    // After eviction, the oldest key should no longer be tracked
    // (it should allow a new request instead of returning false)
    expect(checkRateLimit(oldestIp, now)).toBe(true);

    // But a recent key with rate limit already hit should still be tracked
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      checkRateLimit("1.0.0.999", now);
    }
    expect(checkRateLimit("1.0.0.999", now)).toBe(false);
  });
});

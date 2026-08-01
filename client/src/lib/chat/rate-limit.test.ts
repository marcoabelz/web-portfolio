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

  it("refuses new keys when at capacity, but existing keys still work", () => {
    const trackedIp = "10.0.0.1";
    const now = 1_000;

    // Insert a tracked key at its limit
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      checkRateLimit(trackedIp, now);
    }

    // Insert MAX_TRACKED_KEYS - 1 more distinct IPs to reach capacity
    for (let i = 0; i < 999; i += 1) {
      checkRateLimit(`1.0.0.${i}`, now);
    }

    // Now the map has 1000 entries. We're at capacity.
    // A new key should be refused (fail closed)
    expect(checkRateLimit("20.0.0.1", now)).toBe(false);

    // But the already-tracked key should still be limited normally (over limit)
    expect(checkRateLimit(trackedIp, now)).toBe(false);
  });

  it("accepts new keys after stale entries are pruned at capacity", () => {
    const now = 1_000;
    const staleTime = now + RATE_LIMIT_WINDOW_MS;

    // Insert one key at its limit
    for (let attempt = 0; attempt < RATE_LIMIT_MAX; attempt += 1) {
      checkRateLimit("10.0.0.1", now);
    }

    // Insert MAX_TRACKED_KEYS - 1 more distinct IPs to reach capacity
    for (let i = 0; i < 999; i += 1) {
      checkRateLimit(`1.0.0.${i}`, now);
    }

    // Now we're at capacity (1000 keys). All entries are stale at this time.
    // A new key should be accepted (pruneStaleKeys removed all entries)
    expect(checkRateLimit("20.0.0.1", staleTime)).toBe(true);
  });
});

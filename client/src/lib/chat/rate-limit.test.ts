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
});

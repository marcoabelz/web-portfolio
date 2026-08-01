export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 60_000;

const MAX_TRACKED_KEYS = 1000;

const hits = new Map<string, number[]>();

function pruneStaleKeys(now: number): void {
  hits.forEach((timestamps, key) => {
    if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) {
      hits.delete(key);
    }
  });
}

// ponytail: in-memory and per-instance, so it resets on cold start. Move to Redis
// only if a single process stops being the whole app.
export function checkRateLimit(key: string, now: number = Date.now()): boolean {
  if (hits.size > MAX_TRACKED_KEYS) {
    pruneStaleKeys(now);
    // Enforce hard ceiling by evicting oldest keys after stale sweep
    while (hits.size >= MAX_TRACKED_KEYS) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
  }

  const recent = (hits.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  return true;
}

export function resetRateLimit(): void {
  hits.clear();
}

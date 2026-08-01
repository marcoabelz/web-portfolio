export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 60_000;

const MAX_TRACKED_KEYS = 1000;

const hits = new Map<string, number[]>();

function pruneStaleKeys(now: number): void {
  for (const [key, timestamps] of hits) {
    if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) {
      hits.delete(key);
    }
  }
}

// ponytail: in-memory and per-instance, so it resets on cold start. Move to Redis
// only if a single process stops being the whole app.
export function checkRateLimit(key: string, now: number = Date.now()): boolean {
  if (hits.size > MAX_TRACKED_KEYS) {
    pruneStaleKeys(now);
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

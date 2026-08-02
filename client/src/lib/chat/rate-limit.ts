export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 60_000;

// Sized so honest traffic never reaches it: at 1000 a single spoofed-header flood
// could fill the map and lock out real visitors for a whole window.
export const MAX_TRACKED_KEYS = 50_000;

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
  // Reclaim capacity by pruning stale entries when at capacity
  if (hits.size >= MAX_TRACKED_KEYS) {
    pruneStaleKeys(now);
  }

  // ponytail: at capacity, we refuse to start tracking new keys, so a spoofed-key
  // flood can lock out new visitors for up to one window; a shared store (Redis)
  // keyed per-instance removes the ceiling.
  if (!hits.has(key) && hits.size >= MAX_TRACKED_KEYS) {
    return false;
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

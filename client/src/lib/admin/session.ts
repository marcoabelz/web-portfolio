import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { AdminConfig } from "./config";

export const SESSION_COOKIE = "portfolio_admin_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

// Digesting first makes both operands the same length, so `timingSafeEqual` never
// throws on a length mismatch and a wrong value leaks neither its length nor how far
// it matched.
function constantTimeEquals(left: string, right: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(left, "utf8").digest(),
    createHash("sha256").update(right, "utf8").digest(),
  );
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// The token carries only its expiry. There is exactly one account, so there is no
// identity to encode, and a token that claims nothing cannot be edited into a claim.
export function createSessionToken(secret: string, expiresAt: number): string {
  const payload = String(expiresAt);

  return `${payload}.${sign(payload, secret)}`;
}

export function isSessionValid(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!token) {
    return false;
  }

  const separator = token.lastIndexOf(".");

  if (separator <= 0) {
    return false;
  }

  const payload = token.slice(0, separator);

  if (!constantTimeEquals(token.slice(separator + 1), sign(payload, secret))) {
    return false;
  }

  const expiresAt = Number(payload);

  return Number.isFinite(expiresAt) && now < expiresAt;
}

export function credentialsMatch(
  input: Readonly<{ email: string; password: string }>,
  config: AdminConfig,
): boolean {
  // Both comparisons always run. Returning early on a wrong email would tell an
  // attacker which half of the credential they had already guessed.
  const emailMatches = constantTimeEquals(
    input.email.trim().toLowerCase(),
    config.email.toLowerCase(),
  );
  const passwordMatches = constantTimeEquals(input.password, config.password);

  return emailMatches && passwordMatches;
}

"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { readAdminConfig } from "@/lib/admin/config";
import { checkDraft, MESSAGE_DOMAINS, MESSAGE_LOCALES, serializeMessages } from "@/lib/admin/draft";
import { commitDraft, readDraft } from "@/lib/admin/github";
import {
  createSessionToken,
  credentialsMatch,
  isSessionValid,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin/session";
import { checkRateLimit, clientKey } from "@/lib/chat/rate-limit";

export type SaveResult = Readonly<{ ok: boolean; message: string }>;

export async function login(formData: FormData): Promise<void> {
  const config = readAdminConfig();

  if (!config) {
    redirect("/admin");
  }

  // Five attempts a minute per IP. Without it the single account's password is
  // guessable at request speed, and this account can commit to the repository.
  if (!checkRateLimit(`admin:${clientKey(headers())}`)) {
    redirect("/admin?error=throttled");
  }

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/admin?error=credentials");
  }

  if (!credentialsMatch({ email, password }, config)) {
    redirect("/admin?error=credentials");
  }

  cookies().set(
    SESSION_COOKIE,
    createSessionToken(config.sessionSecret, Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  );

  redirect("/admin");
}

export async function logout(): Promise<void> {
  cookies().delete({ name: SESSION_COOKIE, path: "/admin" });

  redirect("/admin");
}

export async function saveDraft(draft: unknown): Promise<SaveResult> {
  const config = readAdminConfig();

  if (!config) {
    return { ok: false, message: "The editor is not configured." };
  }

  // A server action is a public endpoint: the session is re-checked here rather than
  // trusted from whatever rendered the page that called it.
  if (!isSessionValid(cookies().get(SESSION_COOKIE)?.value, config.sessionSecret)) {
    return { ok: false, message: "Session expired. Reload the page and sign in again." };
  }

  const reference = await readDraft(config);
  const checked = checkDraft(draft, reference);

  if (!checked.ok) {
    return { ok: false, message: checked.error };
  }

  const changed = MESSAGE_LOCALES.flatMap((locale) =>
    MESSAGE_DOMAINS.filter(
      (domain) =>
        serializeMessages(checked.value[locale][domain]) !==
        serializeMessages(reference[locale][domain]),
    ),
  );

  // An empty commit still triggers a Vercel build, so a no-op save stays a no-op.
  if (changed.length === 0) {
    return { ok: false, message: "Nothing changed, so nothing was saved." };
  }

  try {
    await commitDraft(
      config,
      checked.value,
      `content: edit ${Array.from(new Set(changed)).sort().join(", ")} from the editor`,
    );
  } catch (error) {
    // The editor shows one generic line; the reason (bad token, protected branch,
    // branch moved under us) only exists in the server log.
    console.error("admin: commit failed", error);

    return {
      ok: false,
      message: "GitHub rejected the commit. Check the server logs and try again.",
    };
  }

  return { ok: true, message: "Saved. The site rebuilds automatically — live in about a minute." };
}

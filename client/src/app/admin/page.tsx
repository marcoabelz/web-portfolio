import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { readAdminConfig } from "@/lib/admin/config";
import { readDraft } from "@/lib/admin/github";
import { isSessionValid, SESSION_COOKIE } from "@/lib/admin/session";

import { login, logout } from "./actions";
import { Editor } from "./Editor";

// The page reads cookies and the live repository, so nothing here may be cached.
export const dynamic = "force-dynamic";

const LOGIN_ERRORS: Readonly<Record<string, string>> = {
  credentials: "That email and password did not match.",
  throttled: "Too many attempts. Wait a minute and try again.",
};

const fieldClassName =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-accent";

function LoginForm({ error }: { readonly error?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Content editor</h1>
        <p className="text-sm text-muted">Sign in to edit the site copy.</p>
      </div>
      <form action={login} className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input
            className={fieldClassName}
            type="email"
            name="email"
            autoComplete="username"
            required
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Password</span>
          <input
            className={fieldClassName}
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-accent-strong">
            {LOGIN_ERRORS[error] ?? LOGIN_ERRORS.credentials}
          </p>
        ) : null}
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg bg-accent px-4 font-medium text-white transition-colors hover:bg-accent-strong"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  readonly searchParams: Readonly<{ error?: string }>;
}) {
  const config = readAdminConfig();

  // Fails closed like the chat widget: an unconfigured deployment has no editor at
  // all rather than a login box that could never succeed.
  if (!config) {
    notFound();
  }

  if (!isSessionValid(cookies().get(SESSION_COOKIE)?.value, config.sessionSecret)) {
    return <LoginForm error={searchParams.error} />;
  }

  try {
    const { draft, baseSha, publicFiles } = await readDraft(config);

    return (
      <Editor
        draft={draft}
        baseSha={baseSha}
        publicFiles={publicFiles}
        repo={config.repo}
        branch={config.branch}
      />
    );
  } catch (error) {
    // A bad token or a renamed branch would otherwise throw past this page into the
    // generic error screen, which offers no way back out — not even signing out.
    console.error("admin: could not load the content files", error);

    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-xl font-semibold tracking-tight">Could not load the content</h1>
        <p className="text-sm text-muted">
          GitHub did not return the content files for{" "}
          <span className="font-mono">
            {config.repo}@{config.branch}
          </span>
          . Check the token, the repository, and the branch, then reload. The reason is in
          the server logs.
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Sign out
          </button>
        </form>
      </main>
    );
  }
}

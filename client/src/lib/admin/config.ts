export type AdminConfig = Readonly<{
  email: string;
  password: string;
  sessionSecret: string;
  githubToken: string;
  repo: string;
  branch: string;
}>;

// The CMS fails closed the same way the chat widget does: with any variable missing,
// /admin returns 404 rather than rendering a login box that could never succeed. A
// half-configured admin surface is worse than no admin surface.
export function readAdminConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): AdminConfig | null {
  const email = env.ADMIN_EMAIL?.trim();
  const password = env.ADMIN_PASSWORD;
  const sessionSecret = env.ADMIN_SESSION_SECRET;
  const githubToken = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO?.trim();

  if (!email || !password || !sessionSecret || !githubToken || !repo) {
    return null;
  }

  return {
    email,
    password,
    sessionSecret,
    githubToken,
    repo,
    branch: env.GITHUB_BRANCH?.trim() || "main",
  };
}

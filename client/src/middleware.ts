import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

// /admin is excluded like /api: it is a single untranslated surface, and letting the
// locale middleware see it would redirect /admin to /en/admin, which does not exist.
export const config = {
  matcher: ["/((?!admin(?:/|$)|opengraph-image(?:/|$)|api|_next|_vercel|.*\\..*).*)"],
};

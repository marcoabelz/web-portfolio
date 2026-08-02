import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!opengraph-image(?:/|$)|api|_next|_vercel|.*\\..*).*)"],
};

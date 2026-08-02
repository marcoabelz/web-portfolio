import type { AbstractIntlMessages } from "next-intl";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

import { isLocale, type Locale } from "./locale";
import { getMessages } from "./messages";
import { routing } from "./routing";

export function resolveRequestLocale(
  requestedLocale: string | undefined,
): Locale {
  if (requestedLocale === undefined) {
    return routing.defaultLocale;
  }

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  return requestedLocale;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = resolveRequestLocale(requestedLocale);

  return {
    locale,
    timeZone: "Asia/Jakarta",
    // Content collections intentionally use arrays for their display order. They
    // are consumed as raw messages rather than addressed through dotted keys.
    messages: getMessages(locale) as unknown as AbstractIntlMessages,
  };
});

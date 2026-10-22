import type { Locale } from "@/i18n/locale";
import type { YearMonth } from "@/types/portfolio";

const INTL_LOCALE: Record<Locale, string> = { en: "en-US", id: "id-ID" };

// UTC on both sides: a local-time parse would slide "2026-01" back into December
// for a reader west of Greenwich.
export function formatMonth(value: YearMonth, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

export function formatPeriod(
  start: YearMonth,
  end: YearMonth | null,
  locale: Locale,
  presentLabel: string,
): string {
  return `${formatMonth(start, locale)} – ${end ? formatMonth(end, locale) : presentLabel}`;
}

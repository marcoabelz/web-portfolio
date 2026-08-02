import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { ChatWidget } from "@/components/chat/ChatWidget";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { getPortfolioContent } from "@/data/portfolio";
import { isLocale, languageAlternates, localizePath } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";
import { getSharedSocialImage } from "@/lib/social-image";
import { buildPersonStructuredData } from "@/lib/structured-data";

import "../globals.css";

const EMPTY_INTL_MESSAGES = Object.freeze({}) as AbstractIntlMessages;

type Props = Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>;

function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    template,
  );
}

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params: { locale } }: Pick<Props, "params">): Metadata {
  if (!isLocale(locale)) notFound();

  const labels = getMessages(locale).common.labels;
  const title = labels.siteMetadataTitle.replace("{name}", SITE.name);
  const description = labels.siteMetadataDescription;
  const pathname = localizePath("/", locale);
  const canonicalUrl = new URL(pathname, SITE.url).href;
  const alternatePaths = languageAlternates("/");
  const sharedImage = getSharedSocialImage(SITE.url);

  return {
    metadataBase: new URL(SITE.url),
    applicationName: SITE.name,
    authors: [{ name: SITE.name, url: SITE.url }],
    creator: SITE.name,
    robots: {
      index: true,
      follow: true,
    },
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: new URL(alternatePaths.en, SITE.url).href,
        id: new URL(alternatePaths.id, SITE.url).href,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "id_ID",
      url: canonicalUrl,
      siteName: `${SITE.name} ${labels.portfolio}`,
      title,
      description,
      images: [sharedImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [sharedImage],
    },
  };
}

// The whole shell lives here rather than in a root layout: Next.js reuses a
// layout whose segments did not change, so a locale switch has to change a
// segment param for the header/footer to re-render with the new language.
export default function LocaleLayout({ children, params: { locale } }: Props) {
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const messages = getMessages(locale);
  const { accessibility, footer, language, navigation: navigationLabels } = messages.common;
  const { navigation, profile, socialLinks } = getPortfolioContent(locale);
  const serializedPersonStructuredData = JSON.stringify(
    buildPersonStructuredData(locale),
  ).replace(/</g, "\\u003c");

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${manrope.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <ThemeScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializedPersonStructuredData }}
        />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={EMPTY_INTL_MESSAGES} timeZone="Asia/Jakarta">
          <a className="skip-link inline-flex min-h-11 items-center" href="#main-content">
            {accessibility.skipToMainContent}
          </a>
          <SiteHeader
            locale={locale}
            navigation={navigation}
            profile={{ name: profile.name, resumePath: profile.resumePath }}
            labels={{
              home: formatMessage(accessibility.home, { name: profile.name }),
              logo: formatMessage(accessibility.logo, { name: profile.name }),
              primaryNavigation: accessibility.primaryNavigation,
              mobileNavigation: accessibility.mobileNavigation,
              openNavigation: accessibility.openNavigation,
              closeNavigation: accessibility.closeNavigation,
              resume: navigationLabels.resume,
              language,
              theme: {
                switchToLightMode: accessibility.switchToLightMode,
                switchToDarkMode: accessibility.switchToDarkMode,
                toggleColorTheme: accessibility.toggleColorTheme,
              },
            }}
          />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter
            name={profile.name}
            socialLinks={socialLinks}
            labels={{
              copyright: formatMessage(footer.copyright, {
                year: new Date().getFullYear(),
                name: profile.name,
              }),
              socialLinks: accessibility.socialLinks,
              email: accessibility.emailMarco,
              social: accessibility.marcoOnSocial,
              opensInNewTab: accessibility.opensInNewTab,
            }}
          />
          <ScrollToTop label={accessibility.scrollToTop} />
          {/* Server-side gate: without a key the widget never renders and /api/chat
              returns 503, so the feature fails closed rather than half-working. */}
          {process.env.GEMINI_API_KEY ? <ChatWidget /> : null}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

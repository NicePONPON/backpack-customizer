import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ShareDock from "@/components/ShareDock";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "@/i18n/getLocale";
import { loadMessages } from "@/i18n/loadMessages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Vercel injects VERCEL_URL (host only, no protocol) at build/runtime on
// every preview and production deploy. Falling back to localhost keeps
// next/metadata happy during dev. When a custom domain is hooked up, set
// NEXT_PUBLIC_SITE_URL in the project env to override.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const SITE_NAME = "Computex Systems";
const SITE_TAGLINE = "Built for the way you carry.";
const SITE_DESCRIPTION =
  "Modern everyday backpacks engineered for durability, designed without compromise. Available in five colors, customizable for businesses, schools, and organizations.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#222222",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = loadMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          now={new Date()}
          timeZone="UTC"
        >
          {children}
          <ShareDock />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

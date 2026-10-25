import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LOCALES } from "@/i18n/locales";
import { fontClasses } from "../fonts";
import "../globals.css";

// The student site's root layout, once per language: / and /hi are both prerendered.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    icons: ICONS,
    manifest: "/site.webmanifest",
  };
}

const ICONS: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico", sizes: "48x48" },
    { url: "/icon.svg", type: "image/svg+xml" },
  ],
  apple: "/apple-touch-icon.png",
};

export const viewport: Viewport = {
  themeColor: "#1B3A6B",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  return (
    <html lang={locale} className={`${fontClasses} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-900">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { ThemeScript } from "@/components/ui/ThemeScript";
import { fontClasses } from "../fonts";
import "../globals.css";

// Admin has its own root layout: it stays English and outside the student's [locale] routes.
export const metadata: Metadata = {
  title: { default: "Paatra admin", template: "%s · Paatra" },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icon.svg", type: "image/svg+xml" }] },
  robots: { index: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`${fontClasses} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-surface font-sans text-ink">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
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
    <html lang="en" className={`${fontClasses} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-900">{children}</body>
    </html>
  );
}

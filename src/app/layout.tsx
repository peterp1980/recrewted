import type { Metadata } from "next";
import { defaultLocale, getMessages } from "@/i18n";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const t = getMessages();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: t.meta.title,
  description: t.meta.description,
  applicationName: "recrewted",
  publisher: "projx GmbH",
  creator: "projx GmbH",
  openGraph: { siteName: "recrewted", locale: "de_DE", type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport = { themeColor: "#f2eee4" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={defaultLocale}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

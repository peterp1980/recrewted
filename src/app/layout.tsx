import type { Metadata } from "next";
import { defaultLocale, getMessages } from "@/i18n";
import "./globals.css";

const t = getMessages();

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={defaultLocale}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

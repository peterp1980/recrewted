import type { Metadata } from "next";
import Link from "next/link";
import { applyMessages } from "@/i18n";

export const metadata: Metadata = { robots: { index: false } };

type Props = { searchParams: Promise<{ tel?: string; du?: string }> };

export default async function ThanksPage({ searchParams }: Props) {
  const { tel, du } = await searchParams;
  const t = applyMessages(du ? "du" : "sie");
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t.thanksTitle}</h1>
      <p className="text-ink/80">{tel ? t.thanksPhone : t.thanksMail}</p>
      <Link href="/jobs" className="self-start underline">{t.moreJobs}</Link>
    </main>
  );
}

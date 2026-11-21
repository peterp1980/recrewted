import type { Metadata } from "next";
import Link from "next/link";
import { applyMessages, getMessages } from "@/i18n";

export const metadata: Metadata = { robots: { index: false } };

type Props = { searchParams: Promise<{ tel?: string; du?: string; test?: string }> };

export default async function ThanksPage({ searchParams }: Props) {
  const { tel, du, test } = await searchParams;
  const a = getMessages().assessment;
  const token = test && /^[A-Za-z0-9_-]{40,60}$/.test(test) ? test : null;
  const t = applyMessages(du ? "du" : "sie");
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t.thanksTitle}</h1>
      <p className="text-ink/80">{tel ? t.thanksPhone : t.thanksMail}</p>
      {token && (
        <div className="card flex flex-col items-start gap-3 border-brand-300">
          <p className="font-medium">{a.afterApply[du ? "du" : "sie"]}</p>
          <Link href={`/test/${token}`} className="btn-primary">{a.afterApplyCta}</Link>
        </div>
      )}
      <Link href="/jobs" className="self-start underline">{t.moreJobs}</Link>
    </main>
  );
}

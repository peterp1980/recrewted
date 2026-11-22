import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { applyMessages } from "@/i18n";
import { idFromSlug, jobPath } from "@/lib/jobs/format";
import { getPublicJob } from "@/lib/jobs/public";
import { questionsForVacancy } from "@/lib/screening/load";
import { ApplyForm } from "./ApplyForm";
import { entryParam } from "@/lib/careers/profile";
import { refParam } from "@/lib/referrals/code";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { robots: { index: false } };

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export default async function ApplyPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const id = idFromSlug(slug);
  if (!id) notFound();
  const job = await getPublicJob(id).catch(() => null);
  if (!job) notFound();
  const questions = await questionsForVacancy(id);
  const t = applyMessages(job.tone);
  const utm: Record<string, string> = Object.fromEntries(UTM.flatMap((k) => (typeof sp[k] === "string" ? [[k, (sp[k] as string).slice(0, 100)]] : [])));
  const entry = entryParam(sp.quelle);
  if (entry) utm.quelle = entry;
  const ref = refParam(sp.ref);
  if (ref) utm.ref = ref;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10">
      <Link href={jobPath(job)} className="inline-flex items-center gap-1.5 self-start text-sm text-ink/70 hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{job.title}</Link>
      <div className="flex flex-col gap-2">
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800"><Clock className="h-4 w-4" aria-hidden="true" />Dauert etwa zwei Minuten</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.title(job.title)}</h1>
        <p className="text-ink/70">{t.lead}</p>
      </div>
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
        <ApplyForm slug={slug} questions={questions} utm={utm} tone={job.tone} />
      </div>
    </main>
  );
}

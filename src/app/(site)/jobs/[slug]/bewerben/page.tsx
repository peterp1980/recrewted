import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@/components/marks";
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
      <Link href={jobPath(job)} className="inline-flex items-center gap-2 self-start font-mono text-xs font-semibold tracking-widest uppercase hover:text-accent-700"><ArrowLeft className="h-4 w-5" />{job.title}</Link>
      <div className="flex flex-col gap-2">
        <p className="stamp self-start">Dauert etwa 2 Minuten</p>
        <h1 className="mt-2 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{t.title(job.title)}</h1>
        <p className="text-ink/80">{t.lead}</p>
      </div>
      <div className="hard-shadow border-2 border-ink bg-paper p-5 sm:p-7">
        <ApplyForm slug={slug} questions={questions} utm={utm} tone={job.tone} />
      </div>
    </main>
  );
}

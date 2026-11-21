import type { Metadata } from "next";
import Link from "next/link";
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
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href={jobPath(job)} className="text-sm underline">{job.title}</Link>
      <h1 className="text-2xl font-semibold">{t.title(job.title)}</h1>
      <p className="text-ink/80">{t.lead}</p>
      <ApplyForm slug={slug} questions={questions} utm={utm} tone={job.tone} />
    </main>
  );
}

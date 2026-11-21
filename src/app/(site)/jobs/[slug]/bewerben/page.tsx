import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { idFromSlug, jobPath } from "@/lib/jobs/format";
import { getPublicJob } from "@/lib/jobs/public";
import { questionsForVacancy } from "@/lib/screening/load";
import { ApplyForm } from "./ApplyForm";

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
  const t = getMessages().apply;
  const utm = Object.fromEntries(UTM.flatMap((k) => (typeof sp[k] === "string" ? [[k, (sp[k] as string).slice(0, 100)]] : [])));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href={jobPath(job)} className="text-sm underline">{job.title}</Link>
      <h1 className="text-2xl font-semibold">{t.title(job.title)}</h1>
      <p className="text-neutral-700">{t.lead}</p>
      <ApplyForm slug={slug} questions={questions} utm={utm} />
    </main>
  );
}

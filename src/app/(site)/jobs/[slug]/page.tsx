import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, Check, Clock, MapPin, Smartphone, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMessages } from "@/i18n";
import { descriptionSections, idFromSlug, jobPath, jobPostingJsonLd, jsonLdScript, salaryText } from "@/lib/jobs/format";
import { getPublicJob } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";
import { entryParam } from "@/lib/careers/profile";
import { refParam } from "@/lib/referrals/code";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });

async function load(slug: string) {
  const id = idFromSlug(slug);
  if (!id) notFound();
  // Only active vacancies exist publicly; filled or closed ones are gone (404).
  const job = await getPublicJob(id).catch((e) => {
    console.error("job lookup failed", e);
    return null;
  });
  if (!job) notFound();
  return job;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await load((await params).slug);
  const where = job.remote ? "Remote" : job.location;
  const salary = salaryText(job.salaryMin, job.salaryMax, job.salaryPeriod);
  return {
    title: `${job.title}${where ? ` in ${where}` : ""} – recrewted`,
    description: [job.employerName, where, salary].filter(Boolean).join(" · "),
    alternates: { canonical: `${siteUrl()}${jobPath(job)}` },
  };
}

export default async function JobPage({ params, searchParams }: Props) {
  const { slug } = await params;
  // Visitors from a customer's career page or widget keep that origin until they apply.
  const sp = await searchParams;
  const entry = entryParam(sp?.quelle);
  // Employee referral code (?ref=…) is handed on to the application as well.
  const ref = refParam(sp?.ref);
  const applyQuery = new URLSearchParams({ ...(entry ? { quelle: entry } : {}), ...(ref ? { ref } : {}) }).toString();
  const job = await load(slug);
  const canonical = jobPath(job);
  if (`/jobs/${slug}` !== canonical) permanentRedirect(canonical);

  const t = getMessages().jobs;
  const o = getMessages().briefing.options;
  const salary = salaryText(job.salaryMin, job.salaryMax, job.salaryPeriod);

  const applyHref = `${canonical}/bewerben${applyQuery ? `?${applyQuery}` : ""}`;
  const chips: [typeof MapPin, string | null][] = [
    [Building2, job.employerName ?? t.confidential],
    [MapPin, job.remote ? t.remote : [job.postalCode, job.location].filter(Boolean).join(" ") || null],
    [Clock, job.employmentType ? o.employmentType[job.employmentType] : null],
    [CalendarDays, job.briefing.startDate ? `${t.start}: ${dateFmt.format(new Date(job.briefing.startDate))}` : `${t.start}: ${t.asap}`],
  ];

  return (
    <main className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jobPostingJsonLd(job, siteUrl())) }} />
      <section className="relative -mt-[76px] overflow-hidden bg-night pt-[76px] text-white">
        <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-70" />
        <div aria-hidden="true" className="grid-lines absolute inset-0" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-10 pb-14 md:pt-14">
          <Link href="/jobs" className="inline-flex items-center gap-1.5 self-start text-sm text-white/70 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t.back}</Link>
          <h1 className="max-w-4xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{job.title}</h1>
          <ul className="flex flex-wrap gap-2">
            {chips.filter(([, v]) => v).map(([Icon, v]) => (
              <li key={v} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur"><Icon className="h-4 w-4 text-brand-300" aria-hidden="true" />{v}</li>
            ))}
            {salary && <li className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-sm font-semibold text-night"><Wallet className="h-4 w-4" aria-hidden="true" />{salary}</li>}
          </ul>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="flex min-w-0 flex-col gap-8 text-[17px] leading-relaxed">
          {job.adText ? (
            <section className="flex flex-col gap-4">
              {job.adText.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
            </section>
          ) : descriptionSections(job.briefing, job.tone).map((s) => (
            <section key={s.title} className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-bold">{s.title}</h2>
              <ul className="flex flex-col gap-2">
                {s.items.map((i) => (
                  <li key={i} className="flex gap-3"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50"><Check className="h-3.5 w-3.5 text-brand-800" aria-hidden="true" /></span>{i}</li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-sm text-muted">{t.posted} {dateFmt.format(new Date(job.publishedAt))}</p>
        </article>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ApplyBox href={applyHref} />
        </aside>
      </div>
    </main>
  );
}

function ApplyBox({ href }: { href: string }) {
  const t = getMessages().jobs;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-night p-6 text-white shadow-xl">
      <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-70" />
      <div className="relative flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-300"><Smartphone className="h-4 w-4" aria-hidden="true" />In 2 Minuten bewerben</p>
        <Link href={href} className="btn-light w-full py-3.5 text-lg">{t.apply} <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        <p className="text-sm text-white/65">{t.applyHint}</p>
      </div>
    </div>
  );
}

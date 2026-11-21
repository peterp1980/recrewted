import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMessages } from "@/i18n";
import { descriptionSections, idFromSlug, jobPath, jobPostingJsonLd, jsonLdScript, salaryText } from "@/lib/jobs/format";
import { getPublicJob } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";
import { entryParam } from "@/lib/careers/profile";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });

async function load(slug: string) {
  const id = idFromSlug(slug);
  if (!id) notFound();
  // Only active vacancies with salary exist publicly; filled or closed ones are gone (404).
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
  const entry = entryParam((await searchParams)?.quelle);
  const job = await load(slug);
  const canonical = jobPath(job);
  if (`/jobs/${slug}` !== canonical) permanentRedirect(canonical);

  const t = getMessages().jobs;
  const o = getMessages().briefing.options;
  const salary = salaryText(job.salaryMin, job.salaryMax, job.salaryPeriod);
  const facts: [string, string | null][] = [
    [t.employer, job.employerName ?? t.confidential],
    [getMessages().briefing.fields.location, job.remote ? t.remote : [job.postalCode, job.location].filter(Boolean).join(" ")],
    [t.type, job.employmentType ? o.employmentType[job.employmentType] : null],
    [t.salary, salary],
    [t.start, job.briefing.startDate ? dateFmt.format(new Date(job.briefing.startDate)) : t.asap],
  ];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jobPostingJsonLd(job, siteUrl())) }} />
      <Link href="/jobs" className="text-sm underline">{t.back}</Link>
      <h1 className="text-3xl font-bold sm:text-4xl">{job.title}</h1>
      <dl className="card grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-medium">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <ApplyBox href={`${canonical}/bewerben${entry ? `?quelle=${entry}` : ""}`} />
      {job.adText ? (
        <section className="flex flex-col gap-3">
          {job.adText.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
        </section>
      ) : descriptionSections(job.briefing, job.tone).map((s) => (
        <section key={s.title} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-accent-700">{s.title}</h2>
          <ul className="ml-5 list-disc">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      ))}
      <ApplyBox href={`${canonical}/bewerben${entry ? `?quelle=${entry}` : ""}`} />
      <p className="text-sm text-muted">{t.posted} {dateFmt.format(new Date(job.publishedAt))}</p>
    </main>
  );
}

function ApplyBox({ href }: { href: string }) {
  const t = getMessages().jobs;
  return (
    <div className="card flex flex-col gap-2 border-brand-100 bg-brand-50">
      <Link href={href} className="btn-primary self-start px-6 py-3 text-lg">{t.apply}</Link>
      <p className="text-sm text-muted">{t.applyHint}</p>
    </div>
  );
}

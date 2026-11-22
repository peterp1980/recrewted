import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { notFound, permanentRedirect } from "next/navigation";
import { getMessages } from "@/i18n";
import { descriptionSections, idFromSlug, isNew, jobPath, jobPostingJsonLd, jsonLdScript, postedLabel, salaryText, type PublicJob } from "@/lib/jobs/format";
import { getPublicJob, similarJobs } from "@/lib/jobs/public";
import { googleOn } from "@/lib/feeds/settings";
import { siteUrl } from "@/lib/site";
import { entryParam } from "@/lib/careers/profile";
import { refParam } from "@/lib/referrals/code";
import { EmployerMark } from "@/components/jobs/EmployerMark";
import { ShareJob } from "@/components/jobs/ShareJob";
import { Arrow, ArrowLeft, ArrowOut, Asterisk, Tick } from "@/components/marks";

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
  const lead = job.briefing.tasks[0] ? ` ${job.briefing.tasks[0]}.` : "";
  return pageMeta({
    title: `${job.title}${where ? ` in ${where}` : ""} – recrewted`,
    description: `${[job.employerName, where, salary].filter(Boolean).join(" · ")}.${lead} Bewerbung in zwei Minuten, ohne Anschreiben.`.slice(0, 300),
    path: jobPath(job),
  });
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
  const [similar, google] = await Promise.all([similarJobs(job).catch(() => [] as PublicJob[]), googleOn(job.organizationId).catch(() => true)]);

  const t = getMessages().jobs;
  const o = getMessages().briefing.options;
  const du = job.tone === "du";
  const salary = salaryText(job.salaryMin, job.salaryMax, job.salaryPeriod);
  const place = job.remote ? t.remote : [job.postalCode, job.location].filter(Boolean).join(" ") || null;
  const workModel = job.remote ? o.remote.remote : job.briefing.remote !== "onsite" ? o.remote[job.briefing.remote] : null;
  const start = job.briefing.startDate ? dateFmt.format(new Date(job.briefing.startDate)) : t.asap;
  const company = job.employerName ?? "dem Unternehmen";

  const applyHref = `${canonical}/bewerben${applyQuery ? `?${applyQuery}` : ""}`;
  const facts: { label: string; value: string; accent?: boolean }[] = [
    ...(salary ? [{ label: t.salary, value: salary, accent: true }] : []),
    ...(job.employmentType ? [{ label: "Arbeitszeit", value: o.employmentType[job.employmentType] }] : []),
    { label: t.start, value: start },
    ...(place ? [{ label: "Arbeitsort", value: place }] : []),
    ...(workModel && !job.remote ? [{ label: "Arbeitsmodell", value: workModel }] : []),
  ];
  const topBenefits = job.briefing.benefits.slice(0, 3);
  const steps = [
    { title: du ? "Du bewirbst dich" : "Sie bewerben sich", text: "In etwa zwei Minuten am Handy. Ohne Anschreiben, ohne Konto. Ein Lebenslauf ist willkommen, aber kein Muss." },
    { title: du ? "Du bekommst eine Antwort" : "Sie bekommen eine Antwort", text: `Wir sehen uns ${du ? "deine" : "Ihre"} Bewerbung an und melden uns in jedem Fall – auch wenn es nicht passt.` },
    { title: "Kennenlernen", text: `Passt es, ${du ? "lernst du" : "lernen Sie"} ${company} im Gespräch kennen. Den Termin stimmen wir mit ${du ? "dir" : "Ihnen"} ab.` },
  ];
  const posted = postedLabel(job.publishedAt);

  return (
    <main className="overflow-x-clip pb-24 lg:pb-0">
      {/* Google for Jobs: only when the channel is on for this customer (admin → Kanäle). */}
      {google && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jobPostingJsonLd(job, siteUrl())) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd([{ name: "Jobs", path: "/jobs" }, { name: job.title, path: canonical }])) }} />

      <section className="border-b border-ink" style={job.employer?.color ? { borderTop: `6px solid ${job.employer.color}` } : undefined}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 pb-12 md:pt-10">
          <Link href="/jobs" className="inline-flex items-center gap-2 self-start font-mono text-xs font-semibold tracking-widest uppercase hover:text-accent-700"><ArrowLeft className="h-4 w-5" />{t.back}</Link>
          <div className="flex items-center gap-4">
            <EmployerMark job={job} size="lg" />
            <div className="min-w-0">
              <p className="text-lg font-semibold">
                {job.employer?.slug ? <Link href={`/karriere/${job.employer.slug}`} className="underline decoration-accent-500 decoration-2 underline-offset-4">{job.employerName}</Link> : (job.employerName ?? t.confidential)}
              </p>
              <p className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wide text-muted uppercase">
                {isNew(job.publishedAt) && <span className="border border-accent-700 bg-accent-50 px-1.5 py-0.5 font-semibold text-accent-700">Neu</span>}
                <span>Veröffentlicht {posted}</span>
              </p>
            </div>
          </div>
          <h1 className="max-w-4xl font-display text-[2.4rem] leading-[1.02] font-semibold tracking-tight hyphens-auto sm:text-6xl lg:text-7xl">{job.title}</h1>
          <p className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[13px] tracking-wide uppercase">
            {place && <span><span className="text-muted">Ort </span>{place}</span>}
            {job.employmentType && <span><span className="text-muted">Zeit </span>{o.employmentType[job.employmentType]}</span>}
            {salary && <span className="marker font-semibold"><span className="text-ink/70">Gehalt </span>{salary}</span>}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="flex min-w-0 flex-col gap-12 text-[17px] leading-relaxed">
          {/* At a glance: a form, filled in */}
          <section aria-labelledby="glance-h" className="flex flex-col gap-4">
            <h2 id="glance-h" className="label">Steckbrief</h2>
            <dl className="grid grid-cols-2 border-t-2 border-l-2 border-ink sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className={`border-r-2 border-b-2 border-ink p-4 ${f.accent ? "bg-marker" : "bg-paper"}`}>
                  <dt className="label text-ink/70">{f.label}</dt>
                  <dd className="mt-1 font-display text-lg leading-snug font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
            {topBenefits.length > 0 && (
              <ul aria-label="Das bieten wir (Auszug)" className="flex flex-wrap gap-x-5 gap-y-2">
                {topBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-1.5 text-[15px] font-medium"><Tick className="h-4 w-4 text-accent-500" />{b}</li>
                ))}
              </ul>
            )}
          </section>

          {job.adText ? (
            <section className="flex flex-col gap-4">
              {job.adText.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
            </section>
          ) : descriptionSections(job.briefing, job.tone).map((s) => {
            const nice = s.items === job.briefing.niceToHave;
            return (
              <section key={s.title} className="flex flex-col gap-4">
                <h2 className="border-b-2 border-ink pb-2 font-display text-3xl font-semibold">{s.title}</h2>
                <ul className="flex flex-col gap-2.5">
                  {s.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      {nice ? <Asterisk className="mt-1 h-4 w-4 shrink-0 text-ink/50" /> : <Tick className="mt-1 h-5 w-5 shrink-0 text-accent-500" />}
                      {item}
                    </li>
                  ))}
                </ul>
                {nice && <p className="font-display text-lg text-accent-700 italic">{du ? "Fehlt dir davon etwas? Bewirb dich trotzdem." : "Fehlt Ihnen davon etwas? Bewerben Sie sich trotzdem."}</p>}
              </section>
            );
          })}

          {/* About the employer – only for named employers */}
          {job.employerName && (job.employer?.about || job.employer?.image) && (
            <section aria-labelledby="about-h" className="border-2 border-ink bg-paper">
              {job.employer.image && (
                // eslint-disable-next-line @next/next/no-img-element -- career page images may come from any https host
                <img src={job.employer.image} alt="" loading="lazy" className="h-44 w-full border-b-2 border-ink object-cover sm:h-56" />
              )}
              <div className="flex flex-col gap-3 p-6">
                <div className="flex items-center gap-3">
                  <EmployerMark job={job} />
                  <h2 id="about-h" className="font-display text-3xl font-semibold">Über {job.employerName}</h2>
                </div>
                {job.employer.about && <p className="whitespace-pre-line text-ink/85">{job.employer.about}</p>}
                <div className="flex flex-wrap gap-5 text-[15px] font-semibold">
                  {job.employer.slug && <Link href={`/karriere/${job.employer.slug}`} className="inline-flex items-center gap-1.5 underline decoration-accent-500 decoration-2 underline-offset-4">Karriereseite ansehen <ArrowOut /></Link>}
                  {job.employerWebsite && <a href={job.employerWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline decoration-ink/30 decoration-2 underline-offset-4">Website <ArrowOut /></a>}
                </div>
              </div>
            </section>
          )}

          {/* What happens next */}
          <section aria-labelledby="next-h" className="flex flex-col gap-8">
            <h2 id="next-h" className="border-b-2 border-ink pb-2 font-display text-3xl font-semibold">So geht es weiter</h2>
            <ol className="grid gap-8 sm:grid-cols-3 sm:gap-4">
              {steps.map((s, i) => (
                <li key={s.title} className="relative border-2 border-ink bg-paper p-5 pt-7">
                  <span className="absolute -top-px left-4 -translate-y-full border-2 border-b-0 border-ink bg-ink px-2.5 py-0.5 font-mono text-[11px] font-semibold text-paper">{i + 1}</span>
                  <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-col gap-4 border-t border-ink/25 pt-6">
            <ShareJob url={`${siteUrl()}${canonical}`} title={job.title} du={du} />
            <p className="font-mono text-xs tracking-wide text-muted uppercase">{t.posted} {dateFmt.format(new Date(job.publishedAt))}</p>
          </div>
        </article>
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <ApplyBox href={applyHref} job={job} salary={salary} />
        </aside>
      </div>

      {/* Similar jobs */}
      {similar.length > 0 && (
        <section aria-labelledby="similar-h" className="mx-auto max-w-6xl px-4 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
            <h2 id="similar-h" className="font-display text-3xl font-semibold">Ähnliche Stellen</h2>
            <Link href={job.category ? `/jobs?berufsfeld=${job.category}` : "/jobs"} className="inline-flex items-center gap-2 text-[15px] font-semibold underline decoration-accent-500 decoration-2 underline-offset-4">
              {job.category ? `Alle Stellen in ${o.category[job.category]}` : "Alle Stellen"} <Arrow className="h-4 w-6" />
            </Link>
          </div>
          <ul className="grid md:grid-cols-3">
            {similar.map((j, i) => (
              <li key={j.id} className={`border-b border-ink/25 md:border-b-0 ${i ? "md:border-l md:border-ink/25" : ""}`}>
                <Link href={jobPath(j)} className="group flex h-full flex-col gap-3 p-5 transition hover:bg-paper">
                  <div className="flex items-center gap-3">
                    <EmployerMark job={j} />
                    <p className="min-w-0 truncate text-sm text-ink/75">{j.employerName ?? t.confidential}</p>
                  </div>
                  <h3 className="font-display text-xl font-semibold group-hover:underline group-hover:decoration-accent-500 group-hover:decoration-2 group-hover:underline-offset-4">{j.title}</h3>
                  <p className="mt-auto flex flex-wrap gap-2">
                    <span className="chip">{j.remote ? t.remote : j.location}</span>
                    {salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod) && <span className="chip bg-marker">{salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod)}</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Mobile: apply button always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{job.title}</p>
            <p className="truncate font-mono text-[11px] tracking-wide text-muted uppercase">{salary ?? "Dauert etwa zwei Minuten"}</p>
          </div>
          <Link href={applyHref} className="btn-primary shrink-0 px-5 py-3">{t.apply}</Link>
        </div>
      </div>
    </main>
  );
}

function ApplyBox({ href, job, salary }: { href: string; job: PublicJob; salary: string | null }) {
  const t = getMessages().jobs;
  return (
    <div className="hard-shadow-pink border-2 border-ink bg-paper">
      <p className="border-b-2 border-ink bg-ink px-5 py-2.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-paper uppercase">Bewerbung · 2 Minuten</p>
      <div className="flex flex-col gap-5 p-5">
        <div>
          <p className="font-display text-2xl leading-tight font-semibold">{job.title}</p>
          <p className="mt-1 text-sm text-ink/75">{[job.employerName ?? t.confidential, job.remote ? t.remote : job.location].filter(Boolean).join(" · ")}</p>
          {salary && <p className="mt-2 inline-block bg-marker px-1 font-mono text-sm font-semibold">{salary}</p>}
        </div>
        <Link href={href} className="btn-primary w-full py-3.5 text-lg">{t.apply} <Arrow className="h-5 w-7" /></Link>
        <ul className="flex flex-col gap-1.5 text-sm">
          {["Kein Anschreiben", "Kein Konto nötig", "Rückmeldung in jedem Fall"].map((x) => (
            <li key={x} className="flex items-center gap-2"><Tick className="h-4 w-4 text-accent-500" />{x}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

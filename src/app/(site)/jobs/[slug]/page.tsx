import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock, Gift, Laptop, MapPin, MessageCircle, Smartphone, Sparkles, UserCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMessages } from "@/i18n";
import { descriptionSections, idFromSlug, isNew, jobPath, jobPostingJsonLd, jsonLdScript, postedLabel, salaryText, type PublicJob } from "@/lib/jobs/format";
import { getPublicJob, similarJobs } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";
import { entryParam } from "@/lib/careers/profile";
import { refParam } from "@/lib/referrals/code";
import { EmployerMark } from "@/components/jobs/EmployerMark";
import { ShareJob } from "@/components/jobs/ShareJob";

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
  const similar = await similarJobs(job).catch(() => [] as PublicJob[]);

  const t = getMessages().jobs;
  const o = getMessages().briefing.options;
  const du = job.tone === "du";
  const salary = salaryText(job.salaryMin, job.salaryMax, job.salaryPeriod);
  const place = job.remote ? t.remote : [job.postalCode, job.location].filter(Boolean).join(" ") || null;
  const workModel = job.remote ? o.remote.remote : job.briefing.remote !== "onsite" ? o.remote[job.briefing.remote] : null;
  const start = job.briefing.startDate ? dateFmt.format(new Date(job.briefing.startDate)) : t.asap;
  const company = job.employerName ?? "dem Unternehmen";

  const applyHref = `${canonical}/bewerben${applyQuery ? `?${applyQuery}` : ""}`;
  const facts: { icon: typeof MapPin; label: string; value: string; accent?: boolean }[] = [
    ...(salary ? [{ icon: Wallet, label: t.salary, value: salary, accent: true }] : []),
    ...(job.employmentType ? [{ icon: Clock, label: "Arbeitszeit", value: o.employmentType[job.employmentType] }] : []),
    { icon: CalendarDays, label: t.start, value: start },
    ...(place ? [{ icon: MapPin, label: "Arbeitsort", value: place }] : []),
    ...(workModel && !job.remote ? [{ icon: Laptop, label: "Arbeitsmodell", value: workModel }] : []),
  ];
  const topBenefits = job.briefing.benefits.slice(0, 3);
  const steps = [
    { icon: Smartphone, title: du ? "Du bewirbst dich" : "Sie bewerben sich", text: "In etwa zwei Minuten am Handy. Ohne Anschreiben, ohne Konto. Ein Lebenslauf ist willkommen, aber kein Muss." },
    { icon: MessageCircle, title: du ? "Du bekommst eine Antwort" : "Sie bekommen eine Antwort", text: `Wir sehen uns ${du ? "deine" : "Ihre"} Bewerbung an und melden uns in jedem Fall – auch wenn es nicht passt.` },
    { icon: UserCheck, title: "Kennenlernen", text: `Passt es, ${du ? "lernst du" : "lernen Sie"} ${company} im Gespräch kennen. Den Termin stimmen wir mit ${du ? "dir" : "Ihnen"} ab.` },
  ];
  const posted = postedLabel(job.publishedAt);

  return (
    <main className="overflow-x-clip pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jobPostingJsonLd(job, siteUrl())) }} />
      <section className="relative -mt-[76px] overflow-hidden bg-night pt-[76px] text-white">
        <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-70" />
        <div aria-hidden="true" className="grid-lines absolute inset-0" />
        {job.employer?.color && (
          <div aria-hidden="true" className="absolute -top-24 right-0 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: job.employer.color }} />
        )}
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-10 pb-14 md:pt-14">
          <Link href="/jobs" className="inline-flex items-center gap-1.5 self-start text-sm text-white/75 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t.back}</Link>
          <div className="flex items-center gap-4">
            <EmployerMark job={job} size="lg" />
            <div className="min-w-0">
              <p className="font-semibold text-white/90">
                {job.employer?.slug ? <Link href={`/karriere/${job.employer.slug}`} className="underline-offset-4 hover:underline">{job.employerName}</Link> : (job.employerName ?? t.confidential)}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                {isNew(job.publishedAt) && <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold tracking-wide text-white uppercase">Neu</span>}
                <span>Veröffentlicht {posted}</span>
              </p>
            </div>
          </div>
          <h1 className="max-w-4xl font-display text-4xl font-extrabold tracking-tight break-words hyphens-auto sm:text-5xl">{job.title}</h1>
          <ul className="flex flex-wrap gap-2">
            {[[MapPin, place], [Clock, job.employmentType ? o.employmentType[job.employmentType] : null]].filter(([, v]) => v).map(([Icon, v]) => {
              const I = Icon as typeof MapPin;
              return <li key={v as string} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur"><I className="h-4 w-4 text-brand-300" aria-hidden="true" />{v as string}</li>;
            })}
            {salary && <li className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-sm font-semibold text-night"><Wallet className="h-4 w-4" aria-hidden="true" />{salary}</li>}
          </ul>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="flex min-w-0 flex-col gap-10 text-[17px] leading-relaxed">
          {/* At a glance */}
          <section aria-labelledby="glance-h" className="flex flex-col gap-4">
            <h2 id="glance-h" className="sr-only">Auf einen Blick</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className={`rounded-2xl p-4 ${f.accent ? "bg-brand-50 ring-1 ring-brand-100" : "bg-white ring-1 ring-neutral-200"}`}>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink/60 uppercase"><f.icon className="h-3.5 w-3.5" aria-hidden="true" />{f.label}</dt>
                  <dd className={`mt-1 font-display text-base font-bold leading-snug ${f.accent ? "text-brand-800" : ""}`}>{f.value}</dd>
                </div>
              ))}
            </dl>
            {topBenefits.length > 0 && (
              <ul aria-label="Das bieten wir (Auszug)" className="flex flex-wrap gap-2">
                {topBenefits.map((b) => (
                  <li key={b} className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-sm font-medium text-accent-700"><Gift className="h-3.5 w-3.5" aria-hidden="true" />{b}</li>
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
            <section key={s.title} className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-bold">{s.title}</h2>
              <ul className="flex flex-col gap-2">
                {s.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${nice ? "bg-neutral-100" : "bg-brand-50"}`}>
                      {nice ? <Sparkles className="h-3 w-3 text-ink/60" aria-hidden="true" /> : <Check className="h-3.5 w-3.5 text-brand-800" aria-hidden="true" />}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              {nice && (
                <p className="text-sm text-ink/65">{du ? "Fehlt dir davon etwas? Bewirb dich trotzdem." : "Fehlt Ihnen davon etwas? Bewerben Sie sich trotzdem."}</p>
              )}
            </section>
            );
          })}

          {/* About the employer – only for named employers */}
          {job.employerName && (job.employer?.about || job.employer?.image) && (
            <section aria-labelledby="about-h" className="overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200">
              {job.employer.image && (
                // eslint-disable-next-line @next/next/no-img-element -- career page images may come from any https host
                <img src={job.employer.image} alt="" loading="lazy" className="h-44 w-full object-cover sm:h-56" />
              )}
              <div className="flex flex-col gap-3 p-6">
                <div className="flex items-center gap-3">
                  <EmployerMark job={job} />
                  <h2 id="about-h" className="font-display text-2xl font-bold">Über {job.employerName}</h2>
                </div>
                {job.employer.about && <p className="whitespace-pre-line text-ink/80">{job.employer.about}</p>}
                <div className="flex flex-wrap gap-4 text-[15px] font-semibold">
                  {job.employer.slug && <Link href={`/karriere/${job.employer.slug}`} className="inline-flex items-center gap-1 text-brand-800 underline-offset-4 hover:underline">Karriereseite ansehen <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}
                  {job.employerWebsite && <a href={job.employerWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink/75 underline-offset-4 hover:underline">Website <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>}
                </div>
              </div>
            </section>
          )}

          {/* What happens next */}
          <section aria-labelledby="next-h" className="flex flex-col gap-5">
            <h2 id="next-h" className="font-display text-2xl font-bold">So geht es weiter</h2>
            <ol className="grid gap-3 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="relative flex flex-col gap-2 rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-night font-display text-sm font-bold text-white">{i + 1}</span>
                    <s.icon className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-base font-bold">{s.title}</h3>
                  <p className="text-[15px] leading-relaxed text-ink/70">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-col gap-4 border-t border-neutral-200 pt-6">
            <ShareJob url={`${siteUrl()}${canonical}`} title={job.title} du={du} />
            <p className="text-sm text-ink/65">{t.posted} {dateFmt.format(new Date(job.publishedAt))}</p>
          </div>
        </article>
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <ApplyBox href={applyHref} job={job} salary={salary} />
        </aside>
      </div>

      {/* Similar jobs */}
      {similar.length > 0 && (
        <section aria-labelledby="similar-h" className="mx-auto max-w-6xl px-4 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="similar-h" className="font-display text-2xl font-bold">Ähnliche Stellen</h2>
            <Link href={job.category ? `/jobs?berufsfeld=${job.category}` : "/jobs"} className="inline-flex items-center gap-1 text-[15px] font-semibold text-brand-800 underline-offset-4 hover:underline">
              {job.category ? `Alle Stellen in ${o.category[job.category]}` : "Alle Stellen"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {similar.map((j) => (
              <li key={j.id}>
                <Link href={jobPath(j)} className="group flex h-full flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300">
                  <div className="flex items-center gap-3">
                    <EmployerMark job={j} />
                    <p className="min-w-0 truncate text-sm text-ink/70">{j.employerName ?? t.confidential}</p>
                  </div>
                  <h3 className="font-display text-lg font-bold group-hover:text-brand-800">{j.title}</h3>
                  <p className="mt-auto flex flex-wrap gap-2">
                    <span className="chip"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{j.remote ? t.remote : j.location}</span>
                    {salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod) && <span className="chip border-brand-100 bg-brand-50 text-brand-800">{salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod)}</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Mobile: apply button always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1 text-white">
            <p className="truncate text-sm font-semibold">{job.title}</p>
            <p className="truncate text-xs text-white/70">{salary ?? "Dauert etwa zwei Minuten"}</p>
          </div>
          <Link href={applyHref} className="btn-light shrink-0 px-5 py-3">{t.apply}</Link>
        </div>
      </div>
    </main>
  );
}

function ApplyBox({ href, job, salary }: { href: string; job: PublicJob; salary: string | null }) {
  const t = getMessages().jobs;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-night p-6 text-white shadow-xl">
      <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-70" />
      <div className="relative flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-300"><Smartphone className="h-4 w-4" aria-hidden="true" />In 2 Minuten bewerben</p>
        <div>
          <p className="font-display text-lg font-bold leading-snug">{job.title}</p>
          <p className="mt-1 text-sm text-white/70">{[job.employerName ?? t.confidential, job.remote ? t.remote : job.location].filter(Boolean).join(" · ")}</p>
          {salary && <p className="mt-2 text-sm font-semibold text-brand-300">{salary}</p>}
        </div>
        <Link href={href} className="btn-light w-full py-3.5 text-lg">{t.apply} <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        <ul className="flex flex-col gap-1.5 text-sm text-white/75">
          {["Kein Anschreiben", "Kein Konto nötig", "Rückmeldung in jedem Fall"].map((x) => (
            <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-300" aria-hidden="true" />{x}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

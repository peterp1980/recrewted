import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n";
import { CATEGORIES, EMPLOYMENT_TYPES } from "@/lib/briefing/schema";
import { jobsHref, parseJobFilters, RADII, type JobFilters } from "@/lib/jobs/filters";
import { isNew, jobPath, postedLabel, salaryText } from "@/lib/jobs/format";
import { EmployerMark } from "@/components/jobs/EmployerMark";
import { Arrow, Circle, Tick } from "@/components/marks";
import { PAGE_SIZE, searchJobs } from "@/lib/jobs/public";

const t = getMessages().jobs;

export const metadata: Metadata = pageMeta({ title: t.metaTitle, description: t.metaDescription, path: "/jobs" });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };


export default async function JobsPage({ searchParams }: Props) {
  const f = parseJobFilters(await searchParams);
  const b = getMessages().briefing.options;
  let result: Awaited<ReturnType<typeof searchJobs>>;
  try {
    result = await searchJobs(f);
  } catch (e) {
    console.error("job search failed", e);
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14">
        <h1 className="font-display text-5xl font-semibold tracking-tight">{t.title}</h1>
        <p role="alert" className="border-2 border-ink bg-marker p-6">{t.unavailable}</p>
      </main>
    );
  }
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const pageLink = (p: number) => jobsHref(f, { page: p });
  const quick: { label: string; active: boolean; change: Partial<JobFilters> }[] = [
    { label: b.employmentType.full_time, active: f.type === "full_time", change: { type: f.type === "full_time" ? null : "full_time" } },
    { label: b.employmentType.part_time, active: f.type === "part_time", change: { type: f.type === "part_time" ? null : "part_time" } },
    { label: "Remote", active: f.remote, change: { remote: !f.remote } },
    { label: "Mit Gehaltsangabe", active: f.salary, change: { salary: !f.salary } },
  ];
  const filtered = Boolean(f.q || f.where || f.category || f.type || f.remote || f.salary);
  const wider = RADII.find((r) => r > f.radius);

  const sel = "border-2 border-ink bg-paper py-2.5 pr-2 pl-3 text-[15px] font-medium";

  return (
    <main className="overflow-x-clip">
      <section className="border-b border-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-12 pb-12 md:pt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Stellenregister</p>
              <h1 className="mt-3 font-display text-6xl leading-none font-semibold tracking-tight sm:text-8xl">
                <span className="relative inline-block">{t.title}<Circle className="pointer-events-none absolute -inset-x-5 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+2.5rem)] text-accent-500" /></span>
              </h1>
            </div>
            <p className="max-w-sm font-display text-xl italic">Bewerbung in zwei Minuten. Ohne Anschreiben, ohne Konto.</p>
          </div>
          <form id="jobsuche" method="get" role="search" aria-label={t.searchLabel} className="hard-shadow border-2 border-ink bg-paper">
            {f.remote && <input type="hidden" name="remote" value="1" />}
            {f.salary && <input type="hidden" name="gehalt" value="1" />}
            <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_auto_auto]">
              <label className="flex min-w-0 flex-col gap-0.5 border-b-2 border-ink px-4 py-2.5 sm:border-r-2 sm:border-b-0">
                <span className="label">{t.q}</span>
                <input name="q" defaultValue={f.q} placeholder={t.qPlaceholder} className="w-full min-w-0 border-0 bg-transparent py-1 text-lg outline-none placeholder:text-ink/45" />
              </label>
              <label className="flex min-w-0 flex-col gap-0.5 border-b-2 border-ink px-4 py-2.5 sm:border-r-2 sm:border-b-0">
                <span className="label">{t.where}</span>
                <input name="ort" defaultValue={f.where} placeholder={t.wherePlaceholder} autoComplete="postal-code" className="w-full min-w-0 border-0 bg-transparent py-1 text-lg outline-none placeholder:text-ink/45" />
              </label>
              <label className="flex flex-col gap-0.5 border-b-2 border-ink px-4 py-2.5 sm:border-r-2 sm:border-b-0">
                <span className="label">{t.radius}</span>
                <select name="umkreis" defaultValue={String(f.radius)} className="border-0 bg-transparent py-1 text-lg font-medium outline-none">
                  {RADII.map((r) => <option key={r} value={r}>+ {r} {t.km}</option>)}
                </select>
              </label>
              <button type="submit" className="bg-ink px-8 py-4 text-lg font-semibold text-paper transition hover:bg-accent-700">{t.search}</button>
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">{t.category}</span>
              <select name="berufsfeld" form="jobsuche" defaultValue={f.category ?? ""} className={sel}>
                <option value="">{t.category}: {t.all}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{b.category[c]}</option>)}
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">{t.type}</span>
              <select name="art" form="jobsuche" defaultValue={f.type ?? ""} className={sel}>
                <option value="">{t.type}: {t.all}</option>
                {EMPLOYMENT_TYPES.map((e) => <option key={e} value={e}>{b.employmentType[e]}</option>)}
              </select>
            </label>
            <span aria-hidden="true" className="mx-1 hidden h-6 w-0.5 bg-ink sm:block" />
            {quick.map((q) => (
              <Link key={q.label} href={jobsHref(f, q.change)} aria-pressed={q.active} className={`inline-flex items-center gap-1.5 border-2 border-ink px-3.5 py-2 text-[15px] font-medium transition ${q.active ? "bg-ink text-paper" : "bg-paper hover:bg-marker"}`}>
                {q.active && <Tick className="h-4 w-4 text-accent-500" />}{q.label}
              </Link>
            ))}
            {filtered && <Link href="/jobs" className="ml-2 font-mono text-xs font-semibold tracking-widest uppercase underline underline-offset-4 hover:text-accent-700">{t.reset}</Link>}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <p aria-live="polite" className="font-mono text-sm tracking-wide uppercase">
          {t.results(result.total)}
          {result.radiusApplied && result.origin ? ` ${t.near(result.origin, f.radius)}` : ""}
        </p>

        {result.jobs.length === 0 ? (
          <div className="flex flex-col items-start gap-4 border-2 border-dashed border-ink bg-paper px-6 py-12 md:px-10">
            <span className="stamp">Kein Treffer</span>
            <p className="max-w-md font-display text-3xl font-semibold">Hier ist gerade nichts Passendes dabei.</p>
            <p className="max-w-md text-ink/80">Neue Stellen kommen laufend dazu. Probieren Sie es mit einem größeren Umkreis oder weniger Filtern.</p>
            <div className="flex flex-wrap gap-3">
              {result.radiusApplied && wider && <Link href={jobsHref(f, { radius: wider })} className="btn-primary py-2.5">Umkreis auf {wider} km erweitern</Link>}
              {(f.type || f.remote || f.salary || f.category) && <Link href={jobsHref(f, { type: null, remote: false, salary: false, category: null })} className="btn-secondary py-2.5">Nur nach Ort und Stichwort suchen</Link>}
              <Link href="/jobs" className="btn-secondary py-2.5">Alle Stellen ansehen</Link>
            </div>
            <p className="max-w-md text-sm text-ink/75">Schon einmal über recrewted beworben? Dann können Sie sich in Ihrem <Link href="/profil" className="font-semibold underline decoration-accent-500 decoration-2 underline-offset-4">Bewerberprofil</Link> passende neue Stellen per E-Mail schicken lassen.</p>
          </div>
        ) : (
          <ul className="border-t-2 border-ink">
            {result.jobs.map((j, i) => {
              const salary = salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod);
              return (
                <li key={j.id} className="border-b border-ink/25">
                  <Link href={jobPath(j)} className="group grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 py-5 transition hover:bg-paper sm:grid-cols-[2.5rem_auto_1fr_auto] sm:px-2">
                    <span className="hidden font-mono text-sm text-muted sm:block">{String((f.page - 1) * PAGE_SIZE + i + 1).padStart(2, "0")}</span>
                    <EmployerMark job={j} />
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl leading-tight font-semibold group-hover:underline group-hover:decoration-accent-500 group-hover:decoration-2 group-hover:underline-offset-4">{j.title}</h2>
                      <p className="mt-1 text-ink/75">{j.employerName ?? t.confidential}</p>
                      <p className="mt-2 flex flex-wrap gap-2">
                        <span className="chip">{j.remote ? t.remote : j.location}{j.distance !== null && !j.remote ? ` · ${t.distance(j.distance)}` : ""}</span>
                        {j.employmentType && <span className="chip">{b.employmentType[j.employmentType]}</span>}
                        {salary && <span className="chip bg-marker">{salary}</span>}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                      <p className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted uppercase">
                        {isNew(j.publishedAt) && <span className="border border-accent-700 bg-accent-50 px-1.5 py-0.5 font-semibold text-accent-700">Neu</span>}
                        {postedLabel(j.publishedAt).replace(/^am /, "seit ")}
                      </p>
                      <Arrow className="h-5 w-8 transition group-hover:translate-x-1 group-hover:text-accent-700" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Seiten" className="flex items-center justify-center gap-4">
            {f.page > 1 && <Link href={pageLink(f.page - 1)} className="btn-secondary py-2">{t.prev}</Link>}
            <span className="font-mono text-sm">{f.page} / {pages}</span>
            {f.page < pages && <Link href={pageLink(f.page + 1)} className="btn-secondary py-2">{t.next}</Link>}
          </nav>
        )}
      </div>
    </main>
  );
}

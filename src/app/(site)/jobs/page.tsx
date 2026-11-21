import Link from "next/link";
import { ArrowUpRight, Building2, ChevronDown, Clock, MapPin, Search, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { getMessages } from "@/i18n";
import { CATEGORIES, EMPLOYMENT_TYPES } from "@/lib/briefing/schema";
import { parseJobFilters, RADII } from "@/lib/jobs/filters";
import { jobPath, salaryText } from "@/lib/jobs/format";
import { PAGE_SIZE, searchJobs } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";

const t = getMessages().jobs;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: `${siteUrl()}/jobs` },
};

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
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{t.title}</h1>
        <p role="alert" className="rounded-3xl bg-amber-50 p-6 text-amber-900">{t.unavailable}</p>
      </main>
    );
  }
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const pageLink = (p: number) => {
    const q = new URLSearchParams();
    if (f.q) q.set("q", f.q);
    if (f.where) q.set("ort", f.where);
    if (f.where) q.set("umkreis", String(f.radius));
    if (f.category) q.set("berufsfeld", f.category);
    if (f.type) q.set("art", f.type);
    if (p > 1) q.set("seite", String(p));
    const s = q.toString();
    return `/jobs${s ? `?${s}` : ""}`;
  };

  return (
    <main className="overflow-x-clip">
      <section className="relative -mt-[76px] overflow-hidden bg-night pt-[76px] text-white">
        <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-80" />
        <div aria-hidden="true" className="grid-lines absolute inset-0" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-14 pb-16 md:pt-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-widest text-brand-300 uppercase">Offene Stellen</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">{t.title}</h1>
          </div>
          <form method="get" role="search" aria-label={t.searchLabel} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 rounded-3xl bg-white p-2 text-ink shadow-2xl sm:grid-cols-[1.3fr_1fr_auto_auto] sm:rounded-full">
              <label className="flex min-w-0 items-center gap-3 rounded-full px-4 py-1.5">
                <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                <span className="sr-only">{t.q}</span>
                <input name="q" defaultValue={f.q} placeholder={t.qPlaceholder} className="w-full min-w-0 border-0 bg-transparent py-2 outline-none placeholder:text-muted" />
              </label>
              <label className="flex min-w-0 items-center gap-3 rounded-full px-4 py-1.5 sm:border-l sm:border-neutral-200">
                <MapPin className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                <span className="sr-only">{t.where}</span>
                <input name="ort" defaultValue={f.where} placeholder={t.wherePlaceholder} autoComplete="postal-code" className="w-full min-w-0 border-0 bg-transparent py-2 outline-none placeholder:text-muted" />
              </label>
              <label className="flex items-center rounded-full px-3 sm:border-l sm:border-neutral-200">
                <span className="sr-only">{t.radius}</span>
                <select name="umkreis" defaultValue={String(f.radius)} className="border-0 bg-transparent py-2 font-medium outline-none">
                  {RADII.map((r) => <option key={r} value={r}>+ {r} {t.km}</option>)}
                </select>
              </label>
              <button type="submit" className="rounded-full bg-brand-700 px-6 py-3 font-semibold text-white transition hover:bg-brand-800">{t.search}</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">{t.category}</span>
                <select name="berufsfeld" defaultValue={f.category ?? ""} className="appearance-none rounded-full border border-white/15 bg-white/10 py-2 pr-9 pl-4 text-sm text-white backdrop-blur [&>option]:text-ink">
                  <option value="">{t.category}: {t.all}</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{b.category[c]}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-white/70" aria-hidden="true" />
              </label>
              <label className="relative">
                <span className="sr-only">{t.type}</span>
                <select name="art" defaultValue={f.type ?? ""} className="appearance-none rounded-full border border-white/15 bg-white/10 py-2 pr-9 pl-4 text-sm text-white backdrop-blur [&>option]:text-ink">
                  <option value="">{t.type}: {t.all}</option>
                  {EMPLOYMENT_TYPES.map((e) => <option key={e} value={e}>{b.employmentType[e]}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-white/70" aria-hidden="true" />
              </label>
              <Link href="/jobs" className="ml-1 text-sm text-white/70 underline underline-offset-4 hover:text-white">{t.reset}</Link>
            </div>
          </form>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <p aria-live="polite" className="text-ink/70">
          {t.results(result.total)}
          {result.radiusApplied && result.origin ? ` ${t.near(result.origin, f.radius)}` : ""}
        </p>

        {result.jobs.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-ink/70">{t.noResults}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {result.jobs.map((j) => (
              <li key={j.id}>
                <Link href={jobPath(j)} className="group flex h-full flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_20px_50px_-20px_rgb(10_127_140/0.35)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-display text-xl font-bold group-hover:text-brand-800">{j.title}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-ink/65"><Building2 className="h-4 w-4" aria-hidden="true" />{j.employerName ?? t.confidential}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas transition group-hover:bg-brand-700 group-hover:text-white"><ArrowUpRight className="h-5 w-5" aria-hidden="true" /></span>
                  </div>
                  <p className="mt-auto flex flex-wrap gap-2">
                    <span className="chip"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{j.remote ? t.remote : j.location}{j.distance !== null && !j.remote ? ` · ${t.distance(j.distance)}` : ""}</span>
                    {j.employmentType && <span className="chip"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{b.employmentType[j.employmentType]}</span>}
                    {salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod) && <span className="chip border-brand-100 bg-brand-50 text-brand-800"><Wallet className="h-3.5 w-3.5" aria-hidden="true" />{salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod)}</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Seiten" className="flex items-center justify-center gap-3">
            {f.page > 1 && <Link href={pageLink(f.page - 1)} className="btn-secondary py-2">{t.prev}</Link>}
            <span className="text-muted">{f.page} / {pages}</span>
            {f.page < pages && <Link href={pageLink(f.page + 1)} className="btn-secondary py-2">{t.next}</Link>}
          </nav>
        )}
      </div>
    </main>
  );
}

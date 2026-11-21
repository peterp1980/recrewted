import Link from "next/link";
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

const field = "w-full rounded-md border border-neutral-400 px-3 py-2";

export default async function JobsPage({ searchParams }: Props) {
  const f = parseJobFilters(await searchParams);
  const b = getMessages().briefing.options;
  let result: Awaited<ReturnType<typeof searchJobs>>;
  try {
    result = await searchJobs(f);
  } catch (e) {
    console.error("job search failed", e);
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t.title}</h1>
        <p role="alert" className="rounded-md bg-amber-50 p-4 text-amber-900">{t.unavailable}</p>
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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">{t.title}</h1>

      <form method="get" role="search" aria-label={t.searchLabel} className="grid gap-3 sm:grid-cols-6">
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-sm font-medium">{t.q}</span>
          <input name="q" defaultValue={f.q} placeholder={t.qPlaceholder} className={field} />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-sm font-medium">{t.where}</span>
          <input name="ort" defaultValue={f.where} placeholder={t.wherePlaceholder} autoComplete="postal-code" className={field} />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-sm font-medium">{t.radius}</span>
          <select name="umkreis" defaultValue={String(f.radius)} className={field}>
            {RADII.map((r) => <option key={r} value={r}>{r} {t.km}</option>)}
          </select>
        </label>
        <label className="grid gap-1 sm:col-span-3">
          <span className="text-sm font-medium">{t.category}</span>
          <select name="berufsfeld" defaultValue={f.category ?? ""} className={field}>
            <option value="">{t.all}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{b.category[c]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 sm:col-span-3">
          <span className="text-sm font-medium">{t.type}</span>
          <select name="art" defaultValue={f.type ?? ""} className={field}>
            <option value="">{t.all}</option>
            {EMPLOYMENT_TYPES.map((e) => <option key={e} value={e}>{b.employmentType[e]}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-6">
          <button type="submit" className="rounded-md bg-neutral-900 px-5 py-2 font-medium text-white hover:bg-neutral-700">{t.search}</button>
          <Link href="/jobs" className="text-sm underline">{t.reset}</Link>
        </div>
      </form>

      <p aria-live="polite" className="text-neutral-700">
        {t.results(result.total)}
        {result.radiusApplied && result.origin ? ` ${t.near(result.origin, f.radius)}` : ""}
      </p>

      {result.jobs.length === 0 ? (
        <p className="rounded-md bg-neutral-50 p-4 text-neutral-700">{t.noResults}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.jobs.map((j) => (
            <li key={j.id} className="rounded-md border border-neutral-200 p-4 hover:border-neutral-400">
              <h2 className="text-lg font-semibold">
                <Link href={jobPath(j)} className="hover:underline">{j.title}</Link>
              </h2>
              <p className="text-neutral-700">{j.employerName ?? t.confidential}</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                <span>{j.remote ? t.remote : j.location}</span>
                {j.employmentType && <span>{b.employmentType[j.employmentType]}</span>}
                <span>{salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod)}</span>
                {j.distance !== null && !j.remote && <span>{t.distance(j.distance)}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Seiten" className="flex gap-4">
          {f.page > 1 && <Link href={pageLink(f.page - 1)} className="underline">{t.prev}</Link>}
          <span className="text-neutral-600">{f.page} / {pages}</span>
          {f.page < pages && <Link href={pageLink(f.page + 1)} className="underline">{t.next}</Link>}
        </nav>
      )}
    </main>
  );
}

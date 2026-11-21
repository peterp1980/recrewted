import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { vacancyKpis } from "@/lib/portal/load";
import { normalize, pct, sourceLabel, totals } from "@/lib/portal/dashboard";
import { createClient } from "@/lib/supabase/server";
import { myOrganizations } from "@/lib/team/server";

export const metadata = { title: "Auswertung – recrewted" };

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = (n: number | null, digits = 1) => (n === null ? "–" : n.toLocaleString("de-DE", { maximumFractionDigits: digits }));

/** One horizontal bar per row, single hue; the number is always written next to it. */
function Bars({ rows, label }: { rows: { name: string; value: number; note?: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div role="list" aria-label={label} className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.name} role="listitem" className="grid grid-cols-[8.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)_5rem]" title={`${r.name}: ${r.value}${r.note ? ` (${r.note})` : ""}`}>
          <span className="truncate text-ink/80">{r.name}</span>
          <span className="h-4 rounded-r bg-neutral-100">
            <span className="block h-4 rounded-r bg-brand-700" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 4 : 0 }} />
          </span>
          <span className="text-right tabular-nums">{r.value}{r.note && <span className="text-muted"> · {r.note}</span>}</span>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await requireAccess("/portal/auswertung");
  const sp = await searchParams;
  const t = getMessages().dashboard;
  const categories = getMessages().briefing.options.category as Record<string, string>;
  const orgs = await myOrganizations(session.userId);
  const org = orgs.find((o) => o.id === sp.org) ?? orgs[0];
  if (!org) return <main><p className="card">{t.none}</p></main>;

  const supabase = await createClient();
  const [{ data: vacancies }, { data: raw }, { data: bench }] = await Promise.all([
    supabase.from("vacancies").select("id, title, status, category").eq("organization_id", org.id).neq("status", "draft").order("created_at", { ascending: false }),
    supabase.rpc("employer_dashboard", { org: org.id }),
    supabase.rpc("employer_benchmarks", { org: org.id }),
  ]);
  const rows = (raw ?? []).map(normalize);
  const byId = new Map(rows.map((r) => [r.vacancy_id, r]));
  const list = (vacancies ?? []).filter((v) => byId.has(v.id));
  const all = totals(list.map((v) => byId.get(v.id)!));
  // Vacancies were read through RLS above; cost per qualified candidate is computed server-side (never raw media spend).
  const costs = new Map(await Promise.all(list.map(async (v) => [v.id, (await vacancyKpis(v.id).catch(() => null))?.costPerQualified ?? null] as const)));
  const ownCategories = new Set(list.map((v) => v.category ?? "other"));
  const benchmarks = (bench ?? []).filter((b) => ownCategories.has(b.category));
  const own = (cat: string) => {
    const vs = list.filter((v) => (v.category ?? "other") === cat).map((v) => byId.get(v.id)!);
    const d = vs.map((r) => r.first_shortlist_days).filter((x): x is number => x !== null);
    return { days: d.length ? Math.round((d.reduce((s, x) => s + x, 0) / d.length) * 10) / 10 : null, qualified: vs.length ? vs.reduce((s, r) => s + r.qualified, 0) / vs.length : null };
  };

  const funnel = (["applications", "qualified", "shortlisted", "interviews", "hired"] as const).map((k, i) => ({
    name: t.funnelSteps[k],
    value: all[k],
    note: i === 0 ? undefined : `${pct(all[k], all.applications)} %`,
  }));
  const sourceRows = all.sources.map((s) => ({ name: sourceLabel(s.key), value: s.count, note: `${pct(s.count, all.applications)} %` }));

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.title}{org.name ? ` – ${org.name}` : ""}</h1>
        <p className="mt-1 max-w-3xl text-ink/80">{t.lead}</p>
      </div>
      {orgs.length > 1 && (
        <nav aria-label="Unternehmen" className="flex flex-wrap gap-2 text-sm">
          {orgs.map((o) => <a key={o.id} href={`/portal/auswertung?org=${o.id}`} className={`rounded-lg border px-3 py-1 ${o.id === org.id ? "border-brand-700 bg-brand-50" : "border-neutral-300"}`}>{o.name}</a>)}
        </nav>
      )}
      {list.length === 0 ? (
        <p className="card text-muted">{t.none}</p>
      ) : (
        <>
          <section aria-label={t.title} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {([["applications", all.applications], ["qualified", all.qualified], ["shortlisted", all.shortlisted], ["hired", all.hired], ["days", all.avgShortlistDays]] as const).map(([k, v]) => (
              <div key={k} className="card flex flex-col gap-1 p-4">
                <span className="text-sm text-muted">{t.tiles[k]}</span>
                <span className="text-2xl font-semibold tabular-nums">{typeof v === "number" ? num(v) : t.dash}</span>
              </div>
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="funnel-h" className="card flex flex-col gap-3">
              <h2 id="funnel-h" className="text-lg font-semibold">{t.funnel}</h2>
              <Bars rows={funnel} label={t.funnel} />
            </section>
            <section aria-labelledby="src-h" className="card flex flex-col gap-3">
              <h2 id="src-h" className="text-lg font-semibold">{t.sources}</h2>
              {sourceRows.length ? <Bars rows={sourceRows} label={t.sources} /> : <p className="text-muted">{t.dash}</p>}
            </section>
          </div>

          <section aria-labelledby="pv-h" className="card flex flex-col gap-3">
            <h2 id="pv-h" className="text-lg font-semibold">{t.perVacancy}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-medium">{t.cols.vacancy}</th>
                    {(["applications", "qualified", "shortlisted", "interviews", "hired", "days", "cost"] as const).map((k) => <th key={k} className="py-2 pr-3 text-right font-medium">{t.cols[k]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {list.map((v) => {
                    const r = byId.get(v.id)!;
                    const c = costs.get(v.id) ?? null;
                    return (
                      <tr key={v.id}>
                        <td className="py-2 pr-3"><a href={`/portal/vacancies/${v.id}`} className="underline">{v.title}</a></td>
                        {[r.applications, r.qualified, r.shortlisted, r.interviews, r.hired].map((x, i) => <td key={i} className="py-2 pr-3 text-right tabular-nums">{x}</td>)}
                        <td className="py-2 pr-3 text-right tabular-nums">{num(r.first_shortlist_days)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{c === null ? t.dash : eur.format(c)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="bm-h" className="card flex flex-col gap-3">
            <h2 id="bm-h" className="text-lg font-semibold">{t.benchmark}</h2>
            <p className="text-sm text-ink/80">{t.benchmarkLead}</p>
            {benchmarks.length === 0 ? (
              <p className="text-muted">{t.benchmarkNone}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-muted">
                    <tr>{(["category", "vacancies", "days", "qualified", "shortlisted", "hired"] as const).map((k) => <th key={k} className={`py-2 pr-3 font-medium ${k === "category" ? "" : "text-right"}`}>{t.bcols[k]}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {benchmarks.map((b) => {
                      const mine = own(b.category);
                      return (
                        <tr key={b.category}>
                          <td className="py-2 pr-3">{categories[b.category] ?? b.category}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{Number(b.vacancies)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{num(b.median_shortlist_days === null ? null : Number(b.median_shortlist_days))} <span className="text-muted">(Sie: {num(mine.days)})</span></td>
                          <td className="py-2 pr-3 text-right tabular-nums">{num(b.avg_qualified === null ? null : Number(b.avg_qualified))} <span className="text-muted">(Sie: {num(mine.qualified)})</span></td>
                          <td className="py-2 pr-3 text-right tabular-nums">{num(b.avg_shortlisted === null ? null : Number(b.avg_shortlisted))}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{b.hire_rate === null ? t.dash : `${Math.round(Number(b.hire_rate) * 100)} %`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

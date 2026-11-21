import { getMessages } from "@/i18n";
import { overallKpis, vacancyKpis, type VacancyFacts } from "@/lib/kpis";
import { customerCost } from "@/lib/portal/funnel";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccess } from "@/lib/auth/session";

export const metadata = { title: "Kennzahlen – recrewted" };
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

/** The four KPIs (CLAUDE.md): time to shortlist, cost per qualified candidate, fill rate, customer effort. */
export default async function KpiPage() {
  await requireAccess("/admin");
  const t = getMessages().kpis;
  const admin = createAdminClient();
  const [{ data: vacancies }, { data: campaigns }, { data: events }] = await Promise.all([
    admin.from("vacancies").select("id, title, status, published_at, pricing_model, price_eur, media_markup_pct").neq("status", "draft").order("created_at", { ascending: false }).limit(200),
    admin.from("campaigns").select("id, vacancy_id, starts_on, ad_costs(cost_eur)"),
    admin.from("events").select("name, vacancy_id, application_id, occurred_at").in("name", ["qualified", "shortlisted", "hired", "portal_active"]).limit(50000),
  ]);

  const facts: VacancyFacts[] = (vacancies ?? []).map((v) => {
    const camps = (campaigns ?? []).filter((c) => c.vacancy_id === v.id);
    const ev = (events ?? []).filter((e) => e.vacancy_id === v.id);
    const starts = camps.map((c) => c.starts_on).filter((x): x is string => Boolean(x)).sort();
    const shortlists = ev.filter((e) => e.name === "shortlisted").map((e) => e.occurred_at).sort();
    const media = camps.flatMap((c) => c.ad_costs ?? []).reduce((s, c) => s + Number(c.cost_eur), 0);
    const qualified = new Set(ev.filter((e) => e.name === "qualified").map((e) => e.application_id)).size;
    return {
      id: v.id, title: v.title, status: v.status,
      start: starts[0] ?? v.published_at, firstShortlist: shortlists[0] ?? null,
      qualified, hired: new Set(ev.filter((e) => e.name === "hired").map((e) => e.application_id)).size,
      mediaSpend: media,
      customerCost: customerCost({ pricingModel: v.pricing_model, priceEur: v.price_eur === null ? null : Number(v.price_eur), mediaMarkupPct: Number(v.media_markup_pct), mediaSpendEur: media }),
      portalMinutes: ev.filter((e) => e.name === "portal_active").length,
    };
  });
  const all = overallKpis(facts);
  const fmt = (x: number | null, f: (n: number) => string) => (x === null ? "–" : f(x));

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          [t.daysToShortlist, fmt(all.avgDaysToShortlist, (x) => `${n1.format(x)} ${t.days}`)],
          [t.costPerQualified, fmt(all.avgCostPerQualified, eur.format)],
          [t.fillRate, fmt(all.fillRate, (x) => `${n1.format(x)} %`)],
          [t.portalMinutes, fmt(all.avgPortalMinutes, (x) => `${n1.format(x)} ${t.minutes}`)],
        ] as const).map(([k, v]) => <div key={k} className="rounded-md bg-neutral-50 p-3"><dt className="text-sm text-neutral-600">{k}</dt><dd className="text-2xl font-semibold">{v}</dd></div>)}
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead><tr className="border-b border-neutral-300"><th className="py-2 pr-3">{t.vacancy}</th><th className="py-2 pr-3">{t.daysToShortlist}</th><th className="py-2 pr-3">{t.costPerQualified}</th><th className="py-2 pr-3">{t.mediaPerQualified}</th><th className="py-2">{t.portalMinutes}</th></tr></thead>
          <tbody>
            {facts.map((f) => {
              const k = vacancyKpis(f);
              return (
                <tr key={f.id} className="border-b border-neutral-200">
                  <td className="py-2 pr-3"><a href={`/admin/vacancies/${f.id}`} className="hover:underline">{f.title}</a></td>
                  <td className="py-2 pr-3">{fmt(k.daysToShortlist, (x) => n1.format(x))}</td>
                  <td className="py-2 pr-3">{fmt(k.costPerQualified, eur.format)}</td>
                  <td className="py-2 pr-3">{fmt(k.mediaPerQualified, eur.format)}</td>
                  <td className="py-2">{k.portalMinutes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-neutral-600">{t.note}</p>
    </main>
  );
}

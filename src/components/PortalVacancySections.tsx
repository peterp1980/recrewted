import Link from "next/link";
import { getMessages } from "@/i18n";
import { logRead } from "@/lib/audit";
import { vacancyKpis } from "@/lib/portal/load";
import { scoreText } from "@/lib/scorecard/ratings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

/** Customer view of a running vacancy (F14): funnel, cost per qualified candidate, shortlist, contracts. */
export async function PortalVacancySections({ vacancyId, viewerId }: { vacancyId: string; viewerId: string }) {
  const m = getMessages();
  const t = m.portalVacancy;
  const supabase = await createClient();
  const [kpis, { data: shortlist }, { data: contracts }] = await Promise.all([
    vacancyKpis(vacancyId),
    // RLS: customers see applications from the shortlist on.
    supabase.from("applications").select("id, status, score, shortlisted_at, candidates(first_name, last_name)").eq("vacancy_id", vacancyId).order("score", { ascending: false, nullsFirst: false }),
    supabase.from("contracts").select("id, kind, status, signed_at, storage_path").eq("vacancy_id", vacancyId).eq("status", "completed"),
  ]);
  if (shortlist?.length) await logRead(viewerId, "applications", shortlist.map((a) => a.id), "portal_shortlist");

  const links = await Promise.all(
    (contracts ?? []).filter((c) => c.storage_path).map(async (c) => {
      const { data } = await createAdminClient().storage.from("contracts").createSignedUrl(c.storage_path!, 300, { download: true });
      return { ...c, url: data?.signedUrl ?? null };
    }),
  );

  const tiles: [string, string][] = [
    [t.applications, String(kpis.funnel.applications)],
    [t.qualified, String(kpis.funnel.qualified)],
    [t.shortlisted, String(kpis.funnel.shortlisted)],
    [t.hired, String(kpis.funnel.hired)],
    [t.costPerQualified, kpis.costPerQualified === null ? "–" : eur.format(kpis.costPerQualified)],
  ];

  return (
    <>
      <section aria-labelledby="kpi-h" className="flex flex-col gap-3">
        <h2 id="kpi-h" className="text-xl font-semibold">{t.kpis}</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {tiles.map(([k, v]) => (
            <div key={k} className="rounded-md bg-neutral-50 p-3">
              <dt className="text-sm text-neutral-600">{k}</dt>
              <dd className="text-2xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="sl-h" className="flex flex-col gap-3">
        <h2 id="sl-h" className="text-xl font-semibold">{t.shortlist}</h2>
        {shortlist?.length ? (
          <ul className="flex flex-col gap-2">
            {shortlist.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
                <div>
                  <Link href={`/portal/applications/${a.id}`} className="font-medium hover:underline">{a.candidates?.first_name} {a.candidates?.last_name}</Link>
                  <p className="text-sm text-neutral-600">{m.applications.status[a.status]} · {m.scorecard.total} {scoreText(a.score === null ? null : Number(a.score))}</p>
                </div>
                <Link href={`/portal/applications/${a.id}`} className="rounded-md border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100">{t.open}</Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-neutral-600">{t.shortlistEmpty}</p>}
      </section>

      <section aria-labelledby="ct-h" className="flex flex-col gap-2">
        <h2 id="ct-h" className="text-xl font-semibold">{t.contracts}</h2>
        {links.length ? (
          <ul className="flex flex-col gap-1">
            {links.map((c) => (
              <li key={c.id}>
                {t.contractKinds[c.kind as keyof typeof t.contractKinds] ?? c.kind}
                {c.signed_at && <span className="text-sm text-neutral-600"> · {fmt.format(new Date(c.signed_at))}</span>}
                {c.url && <> · <a href={c.url} className="underline">{t.download}</a></>}
              </li>
            ))}
          </ul>
        ) : <p className="text-neutral-600">{t.noContracts}</p>}
      </section>
    </>
  );
}

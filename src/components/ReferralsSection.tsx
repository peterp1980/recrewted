import { getMessages } from "@/i18n";
import { referralLink } from "@/lib/referrals/code";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { createReferrer, setReferrerActive } from "@/app/referral-actions";
import { Notice } from "./Notice";

const field = "w-full rounded-lg border border-neutral-300 px-3 py-2";

/** Employee referral links of one customer, with results. Used in the portal and in the admin. */
export async function ReferralsSection({ organizationId, from, status, canEdit = true }: { organizationId: string; from: "admin" | "portal"; status?: string; canEdit?: boolean }) {
  const t = getMessages().referrals;
  const supabase = await createClient();
  const [{ data: org }, { data: referrers }, { data: stats }] = await Promise.all([
    supabase.from("organizations").select("slug, career_enabled, career_domain").eq("id", organizationId).single(),
    supabase.from("referrers").select("id, name, code, active, created_at").eq("organization_id", organizationId).order("created_at"),
    supabase.rpc("referral_stats", { org: organizationId }),
  ]);
  if (!org) return null;
  const careerBase = org.career_domain ? `https://${org.career_domain}/` : org.slug ? `${siteUrl()}/karriere/${org.slug}` : null;
  const byId = new Map((stats ?? []).map((s) => [s.referrer_id, s]));
  const hidden = (
    <>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="from" value={from} />
    </>
  );

  return (
    <section id="empfehlungen" aria-labelledby="ref-h" className="card flex scroll-mt-20 flex-col gap-4">
      <h2 id="ref-h" className="text-lg font-semibold">{t.title}</h2>
      <p className="max-w-3xl text-ink/80">{t.lead}</p>
      {status && t.notices[status] && <Notice kind={status === "created" || status === "saved" ? "ok" : "error"}>{t.notices[status]}</Notice>}
      {!(org.career_enabled && careerBase) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.noPage}</p>}

      {canEdit && <form action={createReferrer} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {hidden}
        <label className="grid flex-1 gap-1">
          <span className="font-medium">{t.name}</span>
          <input name="name" required minLength={2} maxLength={120} placeholder={t.namePlaceholder} className={field} />
        </label>
        <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.add}</button>
      </form>}

      {(referrers ?? []).length === 0 ? (
        <p className="text-muted">{t.none}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">{t.name}</th>
                <th className="py-2 pr-3 font-medium">{t.link}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.applications}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.shortlisted}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.hired}</th>
                <th className="py-2"><span className="sr-only">Aktion</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {(referrers ?? []).map((r) => {
                const s = byId.get(r.id);
                return (
                  <tr key={r.id} className={r.active ? "" : "text-muted"}>
                    <td className="py-2 pr-3">{r.name}{!r.active && ` (${t.inactive})`}</td>
                    <td className="py-2 pr-3">
                      {careerBase ? (
                        <input readOnly aria-label={`${t.link} ${r.name}`} value={referralLink(careerBase, r.code)} className="w-full min-w-56 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-xs" />
                      ) : (
                        <code className="text-xs">?ref={r.code}</code>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{Number(s?.applications ?? 0)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{Number(s?.shortlisted ?? 0)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{Number(s?.hired ?? 0)}</td>
                    <td className="py-2 text-right">
                      {canEdit && <form action={setReferrerActive}>
                        {hidden}
                        <input type="hidden" name="referrerId" value={r.id} />
                        <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                        <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1 hover:bg-brand-50">{r.active ? t.deactivate : t.activate}</button>
                      </form>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted">{t.hint}</p>
    </section>
  );
}

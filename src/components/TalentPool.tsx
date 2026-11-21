import { Send } from "lucide-react";
import { getMessages } from "@/i18n";
import { comparePoolFit, parsePrefs, poolFit } from "@/lib/profile/alerts";
import { createClient } from "@/lib/supabase/server";
import { invitePoolCandidate } from "@/app/assessment-actions";
import { Notice } from "./Notice";

const day = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });
const SHOWN = 30;

/** Staff: talent pool candidates whose wishes fit this vacancy, with a one-click invitation. */
export async function TalentPool({ vacancyId, status }: { vacancyId: string; status?: string }) {
  const t = getMessages().pool;
  const opts = getMessages().briefing.options;
  const supabase = await createClient();
  const { data: v } = await supabase.from("vacancies").select("status, category, employment_type, latitude, longitude, remote").eq("id", vacancyId).single();
  if (!v) return null;

  const [{ data: pool }, { data: applied }, { data: invites }] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, first_name, last_name, email, talent_pool_consent_at, alert_prefs, applications(submitted_at, vacancies(title))")
      .not("talent_pool_consent_at", "is", null)
      .not("email", "is", null)
      .order("talent_pool_consent_at", { ascending: false })
      .limit(1000),
    supabase.from("applications").select("candidate_id").eq("vacancy_id", vacancyId),
    supabase.from("mail_outbox").select("candidate_id, created_at").eq("template", "pool_invite").contains("data", { vacancyId }),
  ]);
  const appliedIds = new Set((applied ?? []).map((a) => a.candidate_id));
  const invitedAt = new Map((invites ?? []).map((i) => [i.candidate_id, i.created_at]));

  const candidates = (pool ?? []).filter((c) => !appliedIds.has(c.id)).map((c) => ({ c, prefs: parsePrefs(c.alert_prefs) }));
  const codes = [...new Set(candidates.map((x) => x.prefs.postalCode).filter((x): x is string => Boolean(x)))];
  const { data: geo } = codes.length ? await supabase.from("postal_codes").select("code, latitude, longitude").in("code", codes) : { data: [] };
  const coords = new Map((geo ?? []).map((g) => [g.code, { lat: g.latitude, lng: g.longitude }]));
  const vac = { category: v.category, employmentType: v.employment_type, latitude: v.latitude, longitude: v.longitude, remote: v.remote };

  const matches = candidates
    .map((x) => ({ ...x, fit: poolFit(x.prefs, vac, x.prefs.postalCode ? (coords.get(x.prefs.postalCode) ?? null) : null) }))
    .filter((x) => x.fit.fits)
    .sort((a, b) => comparePoolFit(a.fit, b.fit));
  const active = v.status === "active";

  return (
    <section id="talentpool" aria-labelledby="pool-h" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="pool-h" className="text-xl font-semibold">{t.title} <span className="text-base font-normal text-muted">({matches.length})</span></h2>
      <p className="text-ink/80">{t.lead}</p>
      {status && t.notices[status] && <Notice kind={status === "sent" ? "ok" : status === "already" ? "info" : "error"}>{t.notices[status]}</Notice>}
      {!active && matches.length > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.inactive}</p>}
      {matches.length === 0 ? (
        <p className="text-muted">{t.none}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200">
          {matches.slice(0, SHOWN).map(({ c, prefs, fit }) => {
            const last = [...(c.applications ?? [])].sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))[0];
            const invited = invitedAt.get(c.id);
            return (
              <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{c.first_name} {c.last_name}</p>
                  <p className="text-sm text-muted">
                    {prefs.categories.length ? prefs.categories.map((k) => opts.category[k]).join(", ") : t.anyCategory}
                    {fit.distanceKm !== null && ` · ${t.distance(fit.distanceKm)}`}
                    {c.talent_pool_consent_at && ` · ${t.since(day.format(new Date(c.talent_pool_consent_at)))}`}
                  </p>
                  {last?.vacancies?.title && <p className="text-sm text-muted">{t.lastApplied(last.vacancies.title)}</p>}
                </div>
                {invited ? (
                  <p className="shrink-0 text-sm text-emerald-800">{t.invited(day.format(new Date(invited)))}</p>
                ) : active ? (
                  <form action={invitePoolCandidate} className="flex shrink-0 flex-col gap-2 sm:w-72">
                    <input type="hidden" name="vacancyId" value={vacancyId} />
                    <input type="hidden" name="candidateId" value={c.id} />
                    <label className="sr-only" htmlFor={`pool-msg-${c.id}`}>{t.message}</label>
                    <input id={`pool-msg-${c.id}`} name="message" maxLength={1000} placeholder={t.message} className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" />
                    <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"><Send className="h-4 w-4" aria-hidden="true" /> {t.invite}</button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {matches.length > SHOWN && <p className="text-sm text-muted">{t.more(matches.length - SHOWN)}</p>}
    </section>
  );
}

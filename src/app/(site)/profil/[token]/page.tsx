import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n";
import { Notice } from "@/components/Notice";
import { CATEGORIES, EMPLOYMENT_TYPES } from "@/lib/briefing/schema";
import { parsePrefs, RADII } from "@/lib/profile/alerts";
import { candidateFromToken } from "@/lib/profile/server";
import { signToken } from "@/lib/privacy/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestRejectionFeedback, saveJobAlerts, saveProfileData, withdrawApplication } from "@/app/profile-actions";

export const metadata: Metadata = { title: "Bewerberprofil – recrewted", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });
const input = "rounded-lg border border-neutral-300 bg-white px-3 py-2";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ token }, { s }] = await Promise.all([params, searchParams]);
  const id = candidateFromToken(token);
  if (!id) redirect("/profil?s=expired");
  const t = getMessages().profile;
  const opts = getMessages().briefing.options;
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("candidates")
    .select("first_name, last_name, email, phone, talent_pool_consent_at, alert_prefs, profile_opt_in_at, applications(id, status, submitted_at, vacancies(id, title, location, employer_visible, organizations(name)))")
    .eq("id", id)
    .maybeSingle();
  if (!c) redirect("/profil?s=expired");
  if (!c.profile_opt_in_at) await admin.from("candidates").update({ profile_opt_in_at: new Date().toISOString() }).eq("id", id);
  await admin.from("audit_log").insert({ action: "profile_viewed", table_name: "candidates", record_id: id, details: { by: "data_subject" } });

  const prefs = parsePrefs(c.alert_prefs);
  const apps = [...(c.applications ?? [])].sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
  const { data: fbReqs } = apps.length ? await admin.from("feedback_requests").select("application_id, answered_at").in("application_id", apps.map((a) => a.id)) : { data: [] };
  const fb = new Map((fbReqs ?? []).map((r) => [r.application_id, r.answered_at]));
  const OPEN = ["new", "screening", "qualified", "shortlisted", "interview"];
  const secret = process.env.DATA_REQUEST_SECRET;
  const privacyHref = secret ? `/datenschutz/anfrage/${signToken(id, secret)}` : "/datenschutz/anfrage";
  const notice =
    s === "saved" ? <Notice kind="ok">{t.saved}</Notice>
    : s === "alerts" ? <Notice kind="ok">{t.alertsSaved}</Notice>
    : s === "invalid" ? <Notice kind="error">{t.invalidData}</Notice>
    : s === "withdrawn" ? <Notice kind="ok">{t.withdrawn}</Notice>
    : s === "confirm" ? <Notice kind="error">{t.withdrawConfirmMissing}</Notice>
    : s === "notOpen" ? <Notice kind="info">{t.withdrawNotOpen}</Notice>
    : s === "feedbackRequested" ? <Notice kind="ok">{t.feedbackRequested}</Notice>
    : s === "error" ? <Notice kind="error">{t.error}</Notice>
    : null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <p className="eyebrow">{t.title}</p>
        <h1 className="mt-2 text-3xl font-bold">{t.hello(c.first_name)}</h1>
        <p className="mt-2 text-ink/80">{t.lead}</p>
      </div>
      {notice}

      <section id="bewerbungen" aria-labelledby="bew" className="flex scroll-mt-20 flex-col gap-3">
        <h2 id="bew" className="text-xl font-semibold">{t.applications}</h2>
        {apps.length === 0 ? (
          <p className="text-muted">{t.noApplications}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {apps.map((a) => {
              const v = a.vacancies;
              return (
                <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{v?.title}</p>
                    <p className="text-sm text-muted">{[v?.employer_visible ? v.organizations?.name : null, v?.location, t.appliedOn(dateFmt.format(new Date(a.submitted_at)))].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">{t.status[a.status] ?? a.status}</span>
                  {OPEN.includes(a.status) && (
                    <details className="w-full text-sm">
                      <summary className="cursor-pointer text-ink/70 underline">{t.withdraw}</summary>
                      <form action={withdrawApplication} className="mt-2 flex flex-col gap-2 rounded-xl bg-canvas p-3">
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="applicationId" value={a.id} />
                        <label className="flex items-start gap-2"><input type="checkbox" name="confirm" required className="mt-1" /> {t.withdrawConfirm(v?.title ?? "")}</label>
                        <button type="submit" className="self-start rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-800 hover:bg-red-50">{t.withdrawButton}</button>
                      </form>
                    </details>
                  )}
                  {a.status === "rejected" && (
                    fb.has(a.id) ? (
                      <p className="w-full text-sm text-muted">{fb.get(a.id) ? t.feedbackAnswered : t.feedbackPending}</p>
                    ) : (
                      <form action={requestRejectionFeedback} className="w-full">
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="applicationId" value={a.id} />
                        <button type="submit" className="text-sm text-brand-800 underline">{t.feedbackRequest}</button>
                      </form>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/jobs" className="self-start text-sm font-semibold text-brand-800 underline">{getMessages().apply.moreJobs}</Link>
      </section>

      <section id="jobs" aria-labelledby="jobs-h" className="card flex scroll-mt-20 flex-col gap-4">
        <h2 id="jobs-h" className="text-xl font-semibold">{t.jobs}</h2>
        <p className="text-sm text-ink/80">{t.jobsLead}</p>
        <form action={saveJobAlerts} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="alerts" defaultChecked={Boolean(c.talent_pool_consent_at)} className="h-5 w-5" /> {t.alertsOn}
          </label>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t.categories}</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {CATEGORIES.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="categories" value={k} defaultChecked={prefs.categories.includes(k)} /> {opts.category[k]}</label>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t.types}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {EMPLOYMENT_TYPES.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="types" value={k} defaultChecked={prefs.types.includes(k)} /> {opts.employmentType[k]}</label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1 text-sm"><span className="font-medium">{t.postalCode}</span><input name="postalCode" inputMode="numeric" pattern="[0-9]{5}" defaultValue={prefs.postalCode ?? ""} className={`${input} w-32`} /></label>
            <label className="grid gap-1 text-sm"><span className="font-medium">{t.radius}</span>
              <select name="radiusKm" defaultValue={String(prefs.radiusKm ?? 50)} className={input}>
                {RADII.map((r) => <option key={r} value={r}>{r} {t.km}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary self-start">{t.saveAlerts}</button>
        </form>
      </section>

      <section id="daten" aria-labelledby="daten-h" className="card flex scroll-mt-20 flex-col gap-4">
        <h2 id="daten-h" className="text-xl font-semibold">{t.data}</h2>
        <form action={saveProfileData} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="token" value={token} />
          <label className="grid gap-1"><span className="text-sm font-medium">{t.firstName}</span><input name="firstName" required maxLength={80} defaultValue={c.first_name} autoComplete="given-name" className={input} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.lastName}</span><input name="lastName" required maxLength={80} defaultValue={c.last_name} autoComplete="family-name" className={input} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.phone}</span><input name="phone" type="tel" maxLength={40} defaultValue={c.phone ?? ""} autoComplete="tel" className={input} /></label>
          {c.email && <p className="self-end text-sm text-muted">{t.emailFixed(c.email)}</p>}
          <button type="submit" className="btn-primary justify-self-start sm:col-span-2">{t.save}</button>
        </form>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t.privacy}</h2>
        <p className="text-sm text-ink/80">{t.privacyLead}</p>
        <Link href={privacyHref} className="btn-secondary self-start py-2">{t.privacyLink}</Link>
      </section>
    </main>
  );
}

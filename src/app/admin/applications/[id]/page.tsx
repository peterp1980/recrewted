import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { MANUAL_STATUSES } from "@/lib/applications/status";
import { logRead } from "@/lib/audit";
import { requireAccess } from "@/lib/auth/session";
import { loadScorecard } from "@/lib/scorecard/load";
import { RATING_LABELS, scoreText } from "@/lib/scorecard/ratings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";
import { Notice } from "@/components/Notice";
import { CandidateMail } from "@/components/CandidateMail";
import { saveRatings, setApplicationStatus } from "@/app/application-actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; m?: string }> };

export const metadata = { title: "Bewerbung – recrewted" };

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

export default async function ApplicationPage({ params, searchParams }: Props) {
  const [{ id }, { s, m }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const session = await requireAccess("/admin");
  const msg = getMessages();
  const t = msg.application;
  const st = msg.scorecard;

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, submitted_at, cv_storage_path, knockout_reasons, vacancy_id, candidate_id, candidates(first_name, last_name, email, phone, talent_pool_consent_at), vacancies(title), application_attribution(entry_point, channel, utm_source, utm_medium, utm_campaign)")
    .eq("id", id)
    .maybeSingle();
  if (!app) notFound();

  const [scorecard, { data: answers }] = await Promise.all([
    loadScorecard(id),
    supabase.from("screening_answers").select("answer, screening_questions(id, question, position)").eq("application_id", id),
  ]);
  await logRead(session.userId, "candidates", [app.candidate_id], "application_detail");
  await logRead(session.userId, "applications", [app.id], "application_detail");

  let cvUrl: string | null = null;
  if (app.cv_storage_path) {
    const { data } = await createAdminClient().storage.from("cvs").createSignedUrl(app.cv_storage_path, 300);
    cvUrl = data?.signedUrl ?? null;
  }

  const knockouts = Array.isArray(app.knockout_reasons) ? (app.knockout_reasons as string[]) : [];
  const sortedAnswers = [...(answers ?? [])].sort((a, b) => (a.screening_questions?.position ?? 0) - (b.screening_questions?.position ?? 0));
  const answerText = (a: unknown) => (a === true ? t.yes : a === false ? t.no : String(a));
  const missing = (m ?? "").split(",");
  const att = app.application_attribution;
  const c = app.candidates;
  const rated = scorecard?.criteria.filter((x) => x.rating !== null).length ?? 0;

  const notice =
    s === "rated" ? <Notice kind="ok">{st.saved}</Notice>
    : s === "missing" ? <Notice kind="error">{st.missingReason} {scorecard?.criteria.filter((x) => missing.includes(x.id)).map((x) => x.name).join(", ")}</Notice>
    : s === "status" ? <Notice kind="ok">{t.statusSaved}</Notice>
    : s === "incomplete" ? <Notice kind="error">{t.shortlistIncomplete}</Notice>
    : s === "mailQueued" ? <Notice kind="ok">{msg.mail.sent}</Notice>
    : s === "mailSentNow" ? <Notice kind="ok">{msg.mail.sentNow}</Notice>
    : s === "mailCancelled" ? <Notice kind="ok">{msg.mail.cancelledOk}</Notice>
    : s === "mailNoEmail" ? <Notice kind="error">{msg.mail.noEmail}</Notice>
    : s === "mailNeedsMessage" ? <Notice kind="error">{msg.mail.needsMessage}</Notice>
    : s === "statusError" || s === "error" ? <Notice kind="error">{t.statusError}</Notice>
    : null;

  return (
    <main className="flex flex-col gap-6">
      <Link href={`/admin/vacancies/${app.vacancy_id}#bewerbungen`} className="text-sm underline">{t.back}: {app.vacancies?.title}</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{c?.first_name} {c?.last_name}</h1>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-sm">{msg.applications.status[app.status]}</span>
        <span className="text-neutral-700">{st.total}: <strong>{scoreText(scorecard?.score ?? null)}</strong></span>
      </div>
      {notice}

      <section className="grid gap-4 rounded-md bg-neutral-50 p-4 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">{t.contact}</h2>
          {c?.email && <p><a href={`mailto:${c.email}`} className="underline">{c.email}</a></p>}
          {c?.phone && <p><a href={`tel:${c.phone}`} className="underline">{c.phone}</a></p>}
          {c?.talent_pool_consent_at && <p className="text-sm text-neutral-600">{t.talentPool}</p>}
        </div>
        <div>
          <p>{t.received} {fmt.format(new Date(app.submitted_at))}</p>
          {att && <p className="text-sm text-neutral-600">{t.source}: {[att.entry_point, att.channel, att.utm_source, att.utm_medium, att.utm_campaign].filter(Boolean).join(" · ")}</p>}
          <p className="mt-2">
            {cvUrl ? <><a href={cvUrl} target="_blank" rel="noopener noreferrer" className="underline">{t.cv}</a> <span className="text-sm text-neutral-600">({t.cvHint})</span></> : <span className="text-neutral-600">{t.noCv}</span>}
          </p>
        </div>
      </section>

      <section aria-labelledby="answers-h" className="flex flex-col gap-2">
        <h2 id="answers-h" className="text-xl font-semibold">{t.answers}</h2>
        {sortedAnswers.length ? (
          <dl className="grid gap-2">
            {sortedAnswers.map((a) => (
              <div key={a.screening_questions?.id} className={`rounded-md p-3 ${knockouts.includes(a.screening_questions?.id ?? "") ? "bg-red-50" : "bg-neutral-50"}`}>
                <dt>{a.screening_questions?.question}</dt>
                <dd className="font-medium">{answerText(a.answer)}{knockouts.includes(a.screening_questions?.id ?? "") && <span className="ml-2 text-sm text-red-800">– {t.knockout}</span>}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="text-neutral-600">{t.noAnswers}</p>}
      </section>

      <section aria-labelledby="sc-h" className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
        <h2 id="sc-h" className="text-xl font-semibold">{st.title}</h2>
        {!scorecard?.criteria.length ? <p className="text-neutral-600">{st.noCriteria}</p> : (
          <>
            <p className="text-neutral-700">{st.lead}</p>
            <p className="text-sm text-neutral-600">{st.progress(rated, scorecard.criteria.length)}</p>
            <form action={saveRatings} className="flex flex-col gap-4">
              <input type="hidden" name="applicationId" value={id} />
              {scorecard.criteria.map((cr) => (
                <fieldset key={cr.id} className={`grid gap-2 rounded-md p-3 ${missing.includes(cr.id) ? "bg-red-50" : "bg-neutral-50"}`}>
                  <legend className="font-medium">{cr.name} <span className="text-sm font-normal text-neutral-500">({st.weight} {cr.weight})</span></legend>
                  {cr.description && <p className="text-sm text-neutral-600">{cr.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
                        <input type="radio" name={`r_${cr.id}`} value={n} defaultChecked={cr.rating === n} />
                        {n} <span className="text-neutral-500">{RATING_LABELS[n]}</span>
                      </label>
                    ))}
                  </div>
                  <label className="grid gap-1">
                    <span className="text-sm">{st.reason}</span>
                    <textarea name={`why_${cr.id}`} rows={2} maxLength={500} defaultValue={cr.reason ?? ""} className="rounded-md border border-neutral-400 px-3 py-2" />
                  </label>
                </fieldset>
              ))}
              <button type="submit" className="self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">{st.save}</button>
            </form>
            <a href={`/api/scorecards/${id}/pdf`} className="self-start text-sm underline">{st.pdf}</a>
          </>
        )}
      </section>

      <section aria-labelledby="status-h" className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
        <h2 id="status-h" className="text-xl font-semibold">{t.statusTitle}</h2>
        <form action={setApplicationStatus} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="applicationId" value={id} />
          <label className="grid gap-1">
            <span>{t.setStatus}</span>
            <select name="status" defaultValue={MANUAL_STATUSES.includes(app.status) ? app.status : "screening"} className="rounded-md border border-neutral-400 px-3 py-2">
              {MANUAL_STATUSES.map((x) => <option key={x} value={x}>{msg.applications.status[x]}</option>)}
            </select>
          </label>
          <button type="submit" className="rounded-md border border-neutral-400 px-4 py-2 hover:bg-neutral-100">{msg.criteria.save}</button>
        </form>
      </section>

      <CandidateMail applicationId={id} hasEmail={Boolean(c?.email)} />
    </main>
  );
}

import { AtsTransferBox } from "@/components/AtsTransferBox";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { logRead } from "@/lib/audit";
import { requireAccess } from "@/lib/auth/session";
import { loadScorecard } from "@/lib/scorecard/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";
import { Notice } from "@/components/Notice";
import { ScorecardView } from "@/components/ScorecardView";
import { giveFeedback } from "@/app/vacancy-actions";

export const metadata = { title: "Kandidat – recrewted" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string; ats?: string }> };
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const VERDICTS = ["fit", "no_fit", "interview", "hired", "rejected"] as const;

/** Customer view of a shortlisted candidate (F14) with one-click feedback (F6). */
export default async function PortalApplicationPage({ params, searchParams }: Props) {
  const [{ id }, { f, ats }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const session = await requireAccess("/portal");
  const m = getMessages();
  const t = m.feedback;

  // RLS: only shortlisted (or later) applications of the customer's own organization are returned.
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, vacancy_id, candidate_id, cv_storage_path, candidates(first_name, last_name, email, phone), vacancies(title)")
    .eq("id", id)
    .maybeSingle();
  if (!app) notFound();

  // Test results of shortlisted candidates (RLS hides everything else).
  const { data: tests } = await supabase.from("assessment_attempts").select("status, auto_points, manual_points, max_points, assessments(title)").eq("application_id", id).eq("status", "submitted");
  const [scorecard, { data: history }] = await Promise.all([
    loadScorecard(id),
    supabase.from("customer_feedback").select("id, verdict, reason, created_at").eq("application_id", id).order("created_at", { ascending: false }),
  ]);
  await logRead(session.userId, "candidates", [app.candidate_id], "portal_candidate");
  await logRead(session.userId, "scorecard_ratings", [id], "portal_candidate");

  let cvUrl: string | null = null;
  if (app.cv_storage_path) {
    const { data } = await createAdminClient().storage.from("cvs").createSignedUrl(app.cv_storage_path, 300);
    cvUrl = data?.signedUrl ?? null;
  }
  const c = app.candidates;

  return (
    <main className="flex flex-col gap-6">
      <Link href={`/portal/vacancies/${app.vacancy_id}`} className="text-sm underline">{t.back}: {app.vacancies?.title}</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{c?.first_name} {c?.last_name}</h1>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-brand-800 text-sm">{m.applications.status[app.status]}</span>
      </div>
      {f === "saved" && <Notice kind="ok">{t.saved}</Notice>}
      {f === "reason" && <Notice kind="error">{t.reasonRequired}</Notice>}
      {f === "error" && <Notice kind="error">{t.error}</Notice>}

      <section className="flex flex-wrap gap-6 rounded-2xl bg-white p-4">
        <div>
          {c?.email && <p><a href={`mailto:${c.email}`} className="underline">{c.email}</a></p>}
          {c?.phone && <p><a href={`tel:${c.phone}`} className="underline">{c.phone}</a></p>}
        </div>
        {cvUrl && <p><a href={cvUrl} target="_blank" rel="noopener noreferrer" className="underline">{t.cv}</a> <span className="text-sm text-muted">({m.application.cvHint})</span></p>}
      </section>

      <section aria-labelledby="fb-h" className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 id="fb-h" className="text-xl font-semibold">{t.title}</h2>
        <p className="text-ink/80">{t.lead}</p>
        <form action={giveFeedback} className="flex flex-col gap-3">
          <input type="hidden" name="applicationId" value={id} />
          <label className="grid gap-1">
            <span>{t.reason}</span>
            <input name="reason" maxLength={500} className="rounded-lg border border-neutral-300 px-3 py-2" />
          </label>
          <div className="flex flex-wrap gap-2">
            {VERDICTS.map((v) => (
              <button key={v} type="submit" name="verdict" value={v} className={`rounded-lg px-4 py-2 font-medium ${v === "hired" ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border border-neutral-300 hover:bg-brand-50"}`}>
                {t.verdicts[v]}
              </button>
            ))}
          </div>
        </form>
        {history && history.length > 0 && (
          <div>
            <h3 className="font-medium">{t.history}</h3>
            <ul className="text-sm">
              {history.map((h) => <li key={h.id}>{fmt.format(new Date(h.created_at))}: {t.verdicts[h.verdict]}{h.reason ? ` – ${h.reason}` : ""}</li>)}
            </ul>
          </div>
        )}
      </section>

      {scorecard && <ScorecardView data={scorecard} pdfHref={`/api/scorecards/${id}/pdf`} />}
      {(tests ?? []).length > 0 && (
        <section aria-labelledby="test-h" className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 id="test-h" className="text-xl font-semibold">{getMessages().assessment.results}</h2>
          <ul className="flex flex-col gap-1">
            {(tests ?? []).map((r, i) => (
              <li key={i}>
                {(r.assessments as unknown as { title: string } | null)?.title}:{" "}
                <span className="font-semibold">{getMessages().assessment.pointsOf(String(Number(r.auto_points ?? 0) + Number(r.manual_points ?? 0)).replace(".", ","), String(Number(r.max_points ?? 0)).replace(".", ","))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <AtsTransferBox applicationId={id} vacancyId={app.vacancy_id} status={ats} />
    </main>
  );
}

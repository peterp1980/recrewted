import Link from "next/link";
import { notFound } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { getMessages } from "@/i18n";
import { logRead } from "@/lib/audit";
import { requireAccess } from "@/lib/auth/session";
import { RATING_LABELS, scoreText } from "@/lib/scorecard/ratings";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";
import { Notice } from "@/components/Notice";
import { giveFeedback } from "@/app/vacancy-actions";

export const metadata = { title: "Shortlist vergleichen – recrewted" };

const dots = (r: number | null) => (
  <span className="inline-flex gap-1" aria-label={r ? `${r} von 5 – ${RATING_LABELS[r]}` : "nicht bewertet"}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${r !== null && i <= r ? "bg-brand-500" : "bg-neutral-200"}`} />)}
  </span>
);

/** Customer: all shortlisted candidates of a vacancy side by side (criteria, reasons, test), with one-click feedback. */
export default async function ComparePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const [{ id }, { f }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const session = await requireAccess(`/portal/vacancies/${id}`);
  const m = getMessages();
  const t = m.compare;
  const supabase = await createClient();
  const { data: vacancy } = await supabase.from("vacancies").select("id, title").eq("id", id).maybeSingle();
  if (!vacancy) notFound();
  // RLS: customers only see applications from the shortlist on.
  const { data: apps } = await supabase
    .from("applications")
    .select("id, status, score, candidates(first_name, last_name), scorecard_ratings(criterion_id, rating, reason), assessment_attempts(status, auto_points, manual_points, max_points)")
    .eq("vacancy_id", id)
    .not("shortlisted_at", "is", null)
    .order("score", { ascending: false, nullsFirst: false });
  const { data: criteria } = await supabase.from("scorecard_criteria").select("id, name, weight").eq("vacancy_id", id).order("position");
  const list = apps ?? [];
  if (list.length) await logRead(session.userId, "applications", list.map((a) => a.id), "portal_compare");

  const notice = f === "saved" ? <Notice kind="ok">{m.feedback.saved}</Notice> : f === "reason" ? <Notice kind="error">{m.feedback.reasonRequired}</Notice> : f === "error" ? <Notice kind="error">{m.feedback.error}</Notice> : null;
  const col = "min-w-56 border-l border-neutral-200 px-4 py-3 align-top";

  return (
    <main className="flex flex-col gap-5">
      <div>
        <Link href={`/portal/vacancies/${id}`} className="text-sm underline">{vacancy.title}</Link>
        <h1 className="mt-1 text-2xl font-semibold">{t.title}</h1>
        <p className="mt-1 max-w-3xl text-ink/80">{t.lead}</p>
      </div>
      {notice}
      {list.length === 0 ? (
        <p className="card text-muted">{m.portalVacancy.shortlistEmpty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-canvas">
                <th className="sticky left-0 z-10 min-w-48 bg-canvas px-4 py-3 font-medium text-muted">{t.candidate}</th>
                {list.map((a) => (
                  <th key={a.id} className={`${col} font-semibold`}>
                    <Link href={`/portal/applications/${a.id}`} className="text-base hover:underline">{a.candidates?.first_name} {a.candidates?.last_name}</Link>
                    <span className="block text-xs font-normal text-muted">{m.applications.status[a.status]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200 bg-brand-50/40">
                <th className="sticky left-0 z-10 bg-brand-50 px-4 py-3 font-semibold">{m.scorecard.total}</th>
                {list.map((a) => <td key={a.id} className={`${col} text-lg font-bold text-brand-800`}>{scoreText(a.score === null ? null : Number(a.score))}</td>)}
              </tr>
              {(criteria ?? []).map((c) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">{c.name}<span className="block text-xs font-normal text-muted">{m.scorecard.weight} {Number(c.weight)}</span></th>
                  {list.map((a) => {
                    const r = a.scorecard_ratings?.find((x) => x.criterion_id === c.id);
                    return (
                      <td key={a.id} className={col}>
                        {dots(r?.rating ?? null)}
                        {r?.reason && <p className="mt-1 text-xs text-ink/75">{r.reason}</p>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-b border-neutral-200">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">{m.assessment.results}</th>
                {list.map((a) => {
                  const done = (a.assessment_attempts ?? []).filter((x) => x.status === "submitted");
                  return (
                    <td key={a.id} className={col}>
                      {done.length ? done.map((x, i) => <span key={i} className="block">{m.assessment.pointsOf(String(Number(x.auto_points ?? 0) + Number(x.manual_points ?? 0)).replace(".", ","), String(Number(x.max_points ?? 0)).replace(".", ","))}</span>) : <span className="text-muted">–</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">{t.feedback}</th>
                {list.map((a) => (
                  <td key={a.id} className={col}>
                    <div className="flex flex-col gap-2">
                      <form action={giveFeedback}>
                        <input type="hidden" name="applicationId" value={a.id} />
                        <input type="hidden" name="verdict" value="interview" />
                        <input type="hidden" name="return" value="compare" />
                        <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 font-semibold text-white hover:bg-brand-800"><ThumbsUp className="h-4 w-4" aria-hidden="true" /> {t.invite}</button>
                      </form>
                      <details>
                        <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 font-semibold hover:bg-neutral-50 [&::-webkit-details-marker]:hidden"><ThumbsDown className="h-4 w-4" aria-hidden="true" /> {m.feedback.verdicts.no_fit}</summary>
                        <form action={giveFeedback} className="mt-2 flex flex-col gap-2">
                          <input type="hidden" name="applicationId" value={a.id} />
                          <input type="hidden" name="verdict" value="no_fit" />
                          <input type="hidden" name="return" value="compare" />
                          <input name="reason" required minLength={3} maxLength={500} placeholder={m.feedback.reason} className="rounded-lg border border-neutral-300 px-2 py-1.5" />
                          <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">{t.send}</button>
                        </form>
                      </details>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

import { Download, Send } from "lucide-react";
import { getMessages } from "@/i18n";
import { isClosed, score, summarizeEvents, toQuestion, type Answer } from "@/lib/assessments/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { scoreAssessmentAnswer, sendAssessment } from "@/app/assessment-actions";
import { Notice } from "./Notice";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const num = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/** Staff: tests of this application – send, results, browser log, scoring of open answers. */
export async function AssessmentResults({ applicationId, vacancyId, status, link }: { applicationId: string; vacancyId: string; status?: string; link?: string }) {
  const t = getMessages().assessment;
  const supabase = await createClient();
  const [{ data: tests }, { data: attempts }] = await Promise.all([
    supabase.from("assessments").select("id, title, stage, active, assessment_questions(id, position, kind, prompt, case_text, options, correct, points)").eq("vacancy_id", vacancyId).order("created_at"),
    supabase
      .from("assessment_attempts")
      .select("id, assessment_id, status, sent_at, started_at, submitted_at, late, auto_points, manual_points, max_points, assessment_answers(id, question_id, answer, file_path, file_name, auto_points, manual_points, reviewer_note), assessment_events(type)")
      .eq("application_id", applicationId),
  ]);
  if (!tests?.length) return null;

  const notice =
    status === "sent" ? <Notice kind="ok">{t.sent}</Notice>
    : status === "queued" ? <Notice kind="info">{t.sentQueued} <span className="font-mono break-all">{link}</span></Notice>
    : status === "scored" ? <Notice kind="ok">{t.scored}</Notice>
    : status === "noEmail" ? <Notice kind="error">{t.noEmail}</Notice>
    : status === "already" ? <Notice kind="info">{t.already}</Notice>
    : status === "invalid" || status === "error" ? <Notice kind="error">{t.error}</Notice>
    : null;

  const storage = createAdminClient().storage.from("assessment-uploads");

  return (
    <section id="assessment" aria-labelledby="assessment-r" className="card flex scroll-mt-20 flex-col gap-4">
      <h2 id="assessment-r" className="text-xl font-semibold">{t.results}</h2>
      {notice}
      {await Promise.all(tests.map(async (test) => {
        const attempt = attempts?.find((a) => a.assessment_id === test.id);
        if (!attempt) {
          if (!test.active) return null;
          return (
            <form key={test.id} action={sendAssessment} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-4">
              <div>
                <p className="font-semibold">{test.title}</p>
                <p className="text-sm text-muted">{t.stages[test.stage]}</p>
              </div>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="assessmentId" value={test.id} />
              <button type="submit" className="btn-primary py-2"><Send className="h-4 w-4" aria-hidden="true" /> {t.send}</button>
            </form>
          );
        }
        const questions = (test.assessment_questions ?? []).map(toQuestion).sort((a, b) => a.position - b.position);
        const answers = new Map((attempt.assessment_answers ?? []).map((a) => [a.question_id, a]));
        const s = score(questions, new Map([...answers].map(([k, a]) => [k, { auto: a.auto_points === null ? null : Number(a.auto_points), manual: a.manual_points === null ? null : Number(a.manual_points), hasAnswer: a.answer !== null || !!a.file_path }])));
        const log = summarizeEvents(attempt.assessment_events ?? []);
        const minutes = attempt.started_at && attempt.submitted_at ? Math.round((Date.parse(attempt.submitted_at) - Date.parse(attempt.started_at)) / 60000) : null;
        const files = new Map<string, string | null>();
        for (const a of attempt.assessment_answers ?? []) {
          if (a.file_path) files.set(a.id, (await storage.createSignedUrl(a.file_path, 300, { download: a.file_name ?? true })).data?.signedUrl ?? null);
        }
        return (
          <article key={test.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{test.title}</p>
                <p className="text-sm text-muted">
                  {t.status[attempt.status]} · {fmt.format(new Date(attempt.submitted_at ?? attempt.started_at ?? attempt.sent_at))}
                  {attempt.late ? ` · ${t.late}` : ""}
                  {minutes !== null ? ` · ${t.duration(minutes)}` : ""}
                </p>
              </div>
              {attempt.status === "submitted" && (
                <div className="rounded-xl bg-brand-50 px-4 py-2 text-right">
                  <p className="text-lg font-bold text-brand-800">{t.pointsOf(num(s.auto + (s.manual ?? 0)), num(s.max))}</p>
                  {s.open > 0 && <p className="text-xs text-muted">{t.openToScore(s.open)}</p>}
                </div>
              )}
            </div>
            {attempt.status !== "sent" && (
              <p className="text-sm">
                <span className={log.left + log.paste + log.copy > 0 ? "font-semibold text-amber-800" : "text-muted"}>{t.log(log.left, log.paste, log.copy)}</span>
                <span className="block text-xs text-muted">{t.logHint}</span>
              </p>
            )}
            {attempt.status === "submitted" && (
              <ol className="flex flex-col gap-3">
                {questions.map((q, i) => {
                  const a = answers.get(q.id);
                  const value = (a?.answer ?? null) as Answer;
                  const shown =
                    value === null ? null
                    : Array.isArray(value) ? value.join(", ")
                    : typeof value === "object" ? a?.file_name ?? ""
                    : q.kind === "yes_no" ? (value === "yes" ? t.yes : t.no)
                    : value;
                  return (
                    <li key={q.id} className="rounded-xl bg-canvas p-3">
                      <p className="text-sm font-semibold">{i + 1}. {q.prompt} <span className="font-normal text-muted">({q.points} {t.points})</span></p>
                      {shown ? <p className="mt-1 whitespace-pre-line">{shown}</p> : <p className="mt-1 text-muted">{t.noAnswer}</p>}
                      {a && files.get(a.id) && (
                        <a href={files.get(a.id)!} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 underline"><Download className="h-4 w-4" aria-hidden="true" /> {t.file}</a>
                      )}
                      {isClosed(q.kind) && q.correct !== null ? (
                        <p className="mt-1 text-sm text-muted">{t.auto}: {num(Number(a?.auto_points ?? 0))} / {num(q.points)}</p>
                      ) : a ? (
                        <form action={scoreAssessmentAnswer} className="mt-2 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="applicationId" value={applicationId} />
                          <input type="hidden" name="answerId" value={a.id} />
                          <label className="grid gap-1 text-sm"><span>{t.scorePoints} (0–{num(q.points)})</span>
                            <input name="points" inputMode="decimal" required defaultValue={a.manual_points === null ? "" : num(Number(a.manual_points))} className="w-24 rounded-lg border border-neutral-300 px-2 py-1" />
                          </label>
                          <label className="grid min-w-48 flex-1 gap-1 text-sm"><span>{t.note}</span>
                            <input name="note" maxLength={1000} defaultValue={a.reviewer_note ?? ""} className="rounded-lg border border-neutral-300 px-2 py-1" />
                          </label>
                          <button type="submit" className="btn-secondary py-1.5 text-sm">{t.scoreSave}</button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </article>
        );
      }))}
    </section>
  );
}

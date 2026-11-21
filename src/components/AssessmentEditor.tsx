import { ArrowUp, Archive, Trash2 } from "lucide-react";
import { getMessages } from "@/i18n";
import { toQuestion } from "@/lib/assessments/model";
import { createClient } from "@/lib/supabase/server";
import { addAssessmentQuestion, archiveAssessment, createAssessment, moveAssessmentQuestion, removeAssessmentQuestion } from "@/app/assessment-actions";
import { Notice } from "./Notice";

const input = "w-full rounded-lg border border-neutral-300 px-3 py-2";

/** Staff: tests of a vacancy, with their tasks. */
export async function AssessmentEditor({ vacancyId, status }: { vacancyId: string; status?: string }) {
  const t = getMessages().assessment;
  const qt = getMessages().questions;
  const supabase = await createClient();
  const { data: tests } = await supabase
    .from("assessments")
    .select("id, title, intro, stage, time_limit_minutes, active, created_at, assessment_questions(id, position, kind, prompt, case_text, options, correct, points)")
    .eq("vacancy_id", vacancyId)
    .order("created_at");
  const active = (tests ?? []).filter((x) => x.active);
  const archived = (tests ?? []).filter((x) => !x.active);

  const notice =
    status === "saved" ? <Notice kind="ok">{t.saved}</Notice>
    : status === "invalid" ? <Notice kind="error">{t.invalid}</Notice>
    : status === "conflict" ? <Notice kind="error">{t.conflict}</Notice>
    : status === "agg" ? <Notice kind="error">{qt.aggWarning}</Notice>
    : status === "answered" ? <Notice kind="info">{qt.answered}</Notice>
    : status === "error" ? <Notice kind="error">{t.error}</Notice>
    : null;

  return (
    <section id="assessment" aria-labelledby="assessment-h" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="assessment-h" className="text-xl font-semibold">{t.title}</h2>
      <p className="text-ink/80">{t.lead}</p>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.notice}</p>
      {notice}

      {active.length === 0 && <p className="text-muted">{t.none}</p>}
      {active.map((test) => {
        const questions = (test.assessment_questions ?? []).map(toQuestion).sort((a, b) => a.position - b.position);
        const total = questions.reduce((s, q) => s + q.points, 0);
        return (
          <article key={test.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{test.title}</h3>
                <p className="text-sm text-muted">
                  {t.stages[test.stage]} · {test.time_limit_minutes ? `${test.time_limit_minutes} Min.` : "ohne Zeitlimit"} · {questions.length} {t.questions} · {total} {t.points}
                </p>
              </div>
              <form action={archiveAssessment}>
                <input type="hidden" name="vacancyId" value={vacancyId} />
                <input type="hidden" name="assessmentId" value={test.id} />
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-brand-50"><Archive className="h-4 w-4" aria-hidden="true" /> {t.archive}</button>
              </form>
            </div>
            {test.intro && <p className="whitespace-pre-line text-sm text-ink/80">{test.intro}</p>}

            {questions.length === 0 ? (
              <p className="text-muted">{t.noQuestions}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {questions.map((q, i) => (
                  <li key={q.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-canvas p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium"><span className="mr-2 text-muted">{i + 1}.</span>{q.prompt}</p>
                      <p className="text-sm text-muted">
                        {t.kinds[q.kind]} · {q.points} {t.points} · {q.correct === null ? t.manual : t.auto}
                        {q.options.length > 0 && q.kind !== "yes_no" ? ` · ${q.options.join(" / ")}` : ""}
                        {q.correct !== null ? ` · ✓ ${Array.isArray(q.correct) ? q.correct.join(", ") : q.kind === "yes_no" ? (q.correct === "yes" ? t.yes : t.no) : q.correct}` : ""}
                      </p>
                      {q.caseText && <p className="mt-1 line-clamp-2 text-sm text-ink/70">{q.caseText}</p>}
                    </div>
                    <div className="flex gap-1">
                      {i > 0 && (
                        <form action={moveAssessmentQuestion}>
                          <input type="hidden" name="vacancyId" value={vacancyId} />
                          <input type="hidden" name="questionId" value={q.id} />
                          <button type="submit" title={t.up} aria-label={t.up} className="rounded-lg p-1.5 hover:bg-white"><ArrowUp className="h-4 w-4" /></button>
                        </form>
                      )}
                      <form action={removeAssessmentQuestion}>
                        <input type="hidden" name="vacancyId" value={vacancyId} />
                        <input type="hidden" name="questionId" value={q.id} />
                        <button type="submit" title={t.remove} aria-label={t.remove} className="rounded-lg p-1.5 hover:bg-white"><Trash2 className="h-4 w-4" /></button>
                      </form>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <details className="rounded-xl border border-neutral-200 p-3">
              <summary className="cursor-pointer font-semibold text-brand-800">{t.addQuestion}</summary>
              <form action={addAssessmentQuestion} className="mt-3 grid gap-3">
                <input type="hidden" name="vacancyId" value={vacancyId} />
                <input type="hidden" name="assessmentId" value={test.id} />
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <label className="grid gap-1"><span className="text-sm font-medium">{t.kind}</span>
                    <select name="kind" className={input} defaultValue="single">
                      {Object.entries(t.kinds).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1"><span className="text-sm font-medium">{t.points}</span>
                    <input name="points" inputMode="decimal" defaultValue="1" className={input} />
                  </label>
                </div>
                <label className="grid gap-1"><span className="text-sm font-medium">{t.prompt}</span><textarea name="prompt" required rows={2} maxLength={2000} className={input} /></label>
                <label className="grid gap-1"><span className="text-sm font-medium">{t.caseText}</span><textarea name="caseText" rows={4} maxLength={10000} className={input} /></label>
                <label className="grid gap-1"><span className="text-sm font-medium">{t.options}</span><textarea name="options" rows={4} className={input} /></label>
                <label className="grid gap-1"><span className="text-sm font-medium">{t.correct}</span><textarea name="correct" rows={2} className={input} /></label>
                <button type="submit" className="btn-primary justify-self-start py-2">{t.addQuestion}</button>
              </form>
            </details>
          </article>
        );
      })}

      <details className="rounded-2xl border border-neutral-200 p-3">
        <summary className="cursor-pointer font-semibold text-brand-800">{t.create}</summary>
        <form action={createAssessment} className="mt-3 grid gap-3">
          <input type="hidden" name="vacancyId" value={vacancyId} />
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <label className="grid gap-1"><span className="text-sm font-medium">{t.name}</span><input name="title" required minLength={2} maxLength={150} className={input} /></label>
            <label className="grid gap-1"><span className="text-sm font-medium">{t.stage}</span>
              <select name="stage" className={input} defaultValue="invite">
                {Object.entries(t.stages).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1"><span className="text-sm font-medium">{t.timeLimit}</span><input name="timeLimit" type="number" min={1} max={600} className={input} /></label>
          </div>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.intro}</span><textarea name="intro" rows={3} maxLength={3000} className={input} /></label>
          <button type="submit" className="btn-primary justify-self-start py-2">{t.create}</button>
        </form>
      </details>

      {archived.length > 0 && (
        <p className="text-sm text-muted">{t.archived}: {archived.map((a) => a.title).join(", ")}</p>
      )}
    </section>
  );
}

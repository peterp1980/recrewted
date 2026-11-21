import { getMessages } from "@/i18n";
import { toRule, type QuestionKind } from "@/lib/screening/rules";
import { createClient } from "@/lib/supabase/server";
import { addQuestion, removeQuestion } from "@/app/vacancy-actions";
import { Notice } from "./Notice";

const input = "w-full rounded-lg border border-neutral-300 px-3 py-2";

/** Staff editor for knockout questions (F3). */
export async function QuestionEditor({ vacancyId, status }: { vacancyId: string; status?: string }) {
  const t = getMessages().questions;
  const supabase = await createClient();
  const { data: questions } = await supabase.from("screening_questions").select("id, question, kind, options, knockout_rule").eq("vacancy_id", vacancyId).order("position");

  const ruleText = (kind: QuestionKind, raw: unknown) => {
    const r = toRule(kind, raw);
    if (!r) return t.excludeNone;
    if ("exclude" in r) return `${t.excludeAnswer} „${r.exclude === "yes" ? "Ja" : "Nein"}“`;
    if ("excludeOptions" in r) return `${t.excludeAnswer} ${r.excludeOptions.map((o) => `„${o}“`).join(", ")}`;
    return [r.min !== undefined && `${t.min} ${r.min}`, r.max !== undefined && `${t.max} ${r.max}`].filter(Boolean).join(", ");
  };

  const notice =
    status === "saved" ? <Notice kind="ok">{t.saved}</Notice>
    : status === "removed" ? <Notice kind="ok">{t.removed}</Notice>
    : status === "invalid" ? <Notice kind="error">{t.invalid}</Notice>
    : status === "answered" ? <Notice kind="info">{t.answered}</Notice>
    : status === "agg" ? <Notice kind="error">{t.aggWarning}</Notice>
    : status === "error" ? <Notice kind="error">{getMessages().briefing.error}</Notice>
    : null;

  return (
    <section id="fragen" aria-labelledby="fragen-h" className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="fragen-h" className="text-xl font-semibold">{t.title}</h2>
      <p className="text-ink/80">{t.lead}</p>
      {notice}
      {questions?.length ? (
        <ol className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <li key={q.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl bg-white p-3">
              <div>
                <p><span className="mr-2 text-neutral-500">{i + 1}.</span>{q.question}</p>
                <p className="text-sm text-muted">
                  {t.kinds[q.kind as QuestionKind]}
                  {Array.isArray(q.options) ? `: ${(q.options as string[]).join(" / ")}` : ""} · {ruleText(q.kind as QuestionKind, q.knockout_rule)}
                </p>
              </div>
              <form action={removeQuestion}>
                <input type="hidden" name="vacancyId" value={vacancyId} />
                <input type="hidden" name="questionId" value={q.id} />
                <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-brand-50">{t.remove}</button>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted">{t.none}</p>
      )}

      <details className="rounded-2xl border border-neutral-200 bg-white p-3">
        <summary className="cursor-pointer font-medium">{t.add}</summary>
        <form action={addQuestion} className="mt-3 grid gap-3">
          <input type="hidden" name="vacancyId" value={vacancyId} />
          <label className="grid gap-1"><span>{t.question}</span><input name="question" required minLength={5} maxLength={300} className={input} /></label>
          <label className="grid gap-1">
            <span>{t.kind}</span>
            <select name="kind" className={input} defaultValue="yes_no">
              {(["yes_no", "choice", "number"] as const).map((k) => <option key={k} value={k}>{t.kinds[k]}</option>)}
            </select>
          </label>
          <fieldset className="grid gap-2 rounded-2xl bg-white p-3">
            <legend className="text-sm font-medium">{t.kinds.yes_no}</legend>
            <label className="grid gap-1">
              <span>{t.excludeAnswer}</span>
              <select name="excludeAnswer" className={input} defaultValue="no">
                <option value="no">Nein</option><option value="yes">Ja</option><option value="">{t.excludeNone}</option>
              </select>
            </label>
          </fieldset>
          <fieldset className="grid gap-2 rounded-2xl bg-white p-3">
            <legend className="text-sm font-medium">{t.kinds.choice}</legend>
            <label className="grid gap-1"><span>{t.options}</span><textarea name="options" rows={3} className={input} /></label>
            <label className="grid gap-1"><span>{t.excludeOptions}</span><textarea name="excludeOptions" rows={2} className={input} /></label>
          </fieldset>
          <fieldset className="grid gap-2 rounded-2xl bg-white p-3 sm:grid-cols-2">
            <legend className="text-sm font-medium">{t.kinds.number}</legend>
            <label className="grid gap-1"><span>{t.min}</span><input name="min" inputMode="decimal" className={input} /></label>
            <label className="grid gap-1"><span>{t.max}</span><input name="max" inputMode="decimal" className={input} /></label>
          </fieldset>
          <button type="submit" className="justify-self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.add}</button>
        </form>
      </details>
    </section>
  );
}

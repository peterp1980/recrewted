import { getMessages } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { addCriterion, applyCriteriaTemplate, removeCriterion, updateCriterionWeight } from "@/app/application-actions";
import { Notice } from "./Notice";

const input = "w-full rounded-md border border-neutral-400 px-3 py-2";

/** Staff editor for scorecard criteria with weights (F4). */
export async function CriteriaEditor({ vacancyId, status }: { vacancyId: string; status?: string }) {
  const t = getMessages().criteria;
  const supabase = await createClient();
  const { data: criteria } = await supabase.from("scorecard_criteria").select("id, name, description, weight").eq("vacancy_id", vacancyId).order("position");

  const notice =
    status === "saved" ? <Notice kind="ok">{t.saved}</Notice>
    : status === "invalid" ? <Notice kind="error">{t.invalid}</Notice>
    : status === "rated" ? <Notice kind="info">{t.rated}</Notice>
    : status === "exists" ? <Notice kind="info">{t.exists}</Notice>
    : status === "agg" ? <Notice kind="error">{getMessages().questions.aggWarning}</Notice>
    : status === "error" ? <Notice kind="error">{getMessages().briefing.error}</Notice>
    : null;

  return (
    <section id="kriterien" aria-labelledby="kriterien-h" className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
      <h2 id="kriterien-h" className="text-xl font-semibold">{t.title}</h2>
      <p className="text-neutral-700">{t.lead}</p>
      {notice}
      {criteria?.length ? (
        <ol className="flex flex-col gap-2">
          {criteria.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-neutral-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                {c.description && <p className="text-sm text-neutral-600">{c.description}</p>}
              </div>
              <form action={updateCriterionWeight} className="flex items-center gap-2">
                <input type="hidden" name="vacancyId" value={vacancyId} />
                <input type="hidden" name="criterionId" value={c.id} />
                <label className="flex items-center gap-2 text-sm">
                  {t.weight}
                  <select name="weight" defaultValue={String(Number(c.weight))} className="rounded-md border border-neutral-400 px-2 py-1">
                    {[1, 2, 3].map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </label>
                <button type="submit" className="rounded-md border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100">{t.save}</button>
              </form>
              <form action={removeCriterion}>
                <input type="hidden" name="vacancyId" value={vacancyId} />
                <input type="hidden" name="criterionId" value={c.id} />
                <button type="submit" className="rounded-md border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100">{t.remove}</button>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-neutral-600">{t.none}</p>
          <form action={applyCriteriaTemplate}>
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <button type="submit" className="rounded-md border border-neutral-400 px-4 py-2 hover:bg-neutral-100">{t.template}</button>
          </form>
        </div>
      )}
      <details className="rounded-md border border-neutral-200 p-3">
        <summary className="cursor-pointer font-medium">{t.add}</summary>
        <form action={addCriterion} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="vacancyId" value={vacancyId} />
          <label className="grid gap-1"><span>{t.name}</span><input name="name" required minLength={3} maxLength={150} className={input} /></label>
          <label className="grid gap-1"><span>{t.weight}</span>
            <select name="weight" defaultValue="1" className={input}>{[1, 2, 3].map((w) => <option key={w} value={w}>{w}</option>)}</select>
          </label>
          <label className="grid gap-1 sm:col-span-2"><span>{t.description}</span><input name="description" maxLength={300} className={input} /></label>
          <button type="submit" className="justify-self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">{t.add}</button>
        </form>
      </details>
    </section>
  );
}

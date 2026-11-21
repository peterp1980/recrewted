import { Sparkles } from "lucide-react";
import { getMessages } from "@/i18n";
import { screenCriteria } from "@/lib/ai/review";
import { aiAllowed } from "@/lib/ai/run";
import { CriteriaSchema, GuideSchema } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";
import { aiCriteria, aiCriteriaApply, aiDecide, aiGuide } from "@/app/ai-actions";
import { AiNotice } from "./AiNotice";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
const box = "flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-violet-200 bg-white p-4";
const aiBtn = "inline-flex items-center gap-1.5 self-start rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-violet-900 hover:bg-violet-100";

/** Staff: AI suggestions for criteria/questions and an interview guide. Suggestions only; people decide. */
export async function AiVacancyPanel({ vacancyId, status }: { vacancyId: string; status?: string }) {
  const t = getMessages().ai;
  const supabase = await createClient();
  const { data: v } = await supabase.from("vacancies").select("organization_id").eq("id", vacancyId).single();
  if (!v || !(await aiAllowed(v.organization_id, "assist"))) return null;
  const { data: recs } = await supabase
    .from("ai_recommendations")
    .select("id, kind, output, status, created_at")
    .eq("vacancy_id", vacancyId)
    .in("kind", ["criteria_suggestion", "interview_guide"])
    .neq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(10);
  const openCriteria = (recs ?? []).find((r) => r.kind === "criteria_suggestion" && r.status === "suggested");
  const guide = (recs ?? []).find((r) => r.kind === "interview_guide" && r.status !== "rejected");
  const criteriaStatus = status && ["criteria", "applied", "rejected", "decided", "off", "failed", "refused"].includes(status) ? status : undefined;
  const guideStatus = status && ["guide", "accepted", "noCriteria"].includes(status) ? status : undefined;

  const parsed = openCriteria ? CriteriaSchema.safeParse(openCriteria.output) : null;
  const screened = parsed?.success ? screenCriteria(parsed.data) : null;
  const guideOut = guide ? GuideSchema.safeParse(guide.output) : null;

  return (
    <>
      <section id="ki-kriterien" aria-labelledby="ki-c-h" className={box}>
        <h2 id="ki-c-h" className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-violet-700" aria-hidden="true" />{t.criteriaTitle}</h2>
        <p className="text-sm text-ink/80">{t.criteriaLead}</p>
        {criteriaStatus && <AiNotice status={criteriaStatus} />}
        {!screened ? (
          <form action={aiCriteria}>
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <button type="submit" className={aiBtn}><Sparkles className="h-4 w-4" aria-hidden="true" />{t.criteriaButton}</button>
          </form>
        ) : (
          <form action={aiCriteriaApply} className="flex flex-col gap-4">
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <input type="hidden" name="recId" value={openCriteria!.id} />
            <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900"><span className="font-semibold">{t.badge} · {fmt.format(new Date(openCriteria!.created_at))}:</span> {t.disclaimer}</p>
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">Kriterien</legend>
              {screened.criteria.ok.map((c, i) => (
                <label key={i} className="flex items-start gap-2 rounded-lg border border-neutral-200 p-2">
                  <input type="checkbox" name={`c_${i}`} className="mt-1" />
                  <span>
                    <span className="font-medium">{c.name}</span> <span className="text-sm text-muted">({t.weight} {c.weight})</span>
                    <span className="block text-sm text-ink/80">{c.description}</span>
                    <span className="block text-xs text-muted">{t.from}: {c.source}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">Fragen im Bewerbungsformular</legend>
              {screened.questions.ok.map((q, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-2">
                  <label className="flex items-start gap-2"><input type="checkbox" name={`q_${i}`} className="mt-1" /><span>{q.question}<span className="block text-xs text-muted">{q.reason}</span></span></label>
                  {/* Unchecked by default: excluding candidates is a decision a person makes deliberately. */}
                  <label className="ml-6 flex items-center gap-2 text-sm"><input type="checkbox" name={`k_${i}`} /> {t.knockoutHint}{q.knockout && <span className="text-xs text-violet-800">({t.aiKnockout})</span>}</label>
                </div>
              ))}
            </fieldset>
            {screened.criteria.dropped.length + screened.questions.dropped.length > 0 && (
              <p className="text-sm text-amber-900">{t.dropped(screened.criteria.dropped.length + screened.questions.dropped.length)}</p>
            )}
            {parsed?.success && parsed.data.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">{t.warnings}</p>
                <ul className="ml-5 list-disc">{parsed.data.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.apply}</button>
              <button type="submit" name="decision" value="reject" className="rounded-lg border border-neutral-300 px-4 py-2 hover:bg-red-50">{t.reject}</button>
            </div>
          </form>
        )}
      </section>

      <section id="ki-leitfaden" aria-labelledby="ki-g-h" className={box}>
        <h2 id="ki-g-h" className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-violet-700" aria-hidden="true" />{t.guideTitle}</h2>
        <p className="text-sm text-ink/80">{t.guideLead}</p>
        {guideStatus && <AiNotice status={guideStatus} />}
        {guideOut?.success && (
          <div className="flex flex-col gap-3">
            {guide!.status === "suggested" && <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900"><span className="font-semibold">{t.badge}:</span> {t.disclaimer}</p>}
            {guideOut.data.sections.map((s) => (
              <div key={s.criterion} className="rounded-lg border border-neutral-200 p-3">
                <p className="font-medium">{s.criterion}</p>
                <ul className="ml-5 list-disc text-sm">{s.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                <p className="mt-1 text-sm text-muted">{t.goodAnswer}: {s.goodAnswer}</p>
              </div>
            ))}
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
              <p className="font-medium">{t.doNotAsk}</p>
              <ul className="ml-5 list-disc">{guideOut.data.doNotAsk.map((q) => <li key={q}>{q}</li>)}</ul>
            </div>
            {guide!.status === "suggested" && (
              <form action={aiDecide} className="flex flex-wrap gap-2">
                <input type="hidden" name="vacancyId" value={vacancyId} />
                <input type="hidden" name="recId" value={guide!.id} />
                <input type="hidden" name="anchor" value="ki-leitfaden" />
                <button type="submit" name="decision" value="accept" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.keep}</button>
                <button type="submit" name="decision" value="reject" className="rounded-lg border border-neutral-300 px-4 py-2 hover:bg-red-50">{t.reject}</button>
              </form>
            )}
          </div>
        )}
        <form action={aiGuide}>
          <input type="hidden" name="vacancyId" value={vacancyId} />
          <button type="submit" className={aiBtn}><Sparkles className="h-4 w-4" aria-hidden="true" />{t.guideButton}</button>
        </form>
      </section>
    </>
  );
}

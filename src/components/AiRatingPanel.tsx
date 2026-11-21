import { Sparkles } from "lucide-react";
import { getMessages } from "@/i18n";
import { answersAsText, checkedRatings } from "@/lib/ai/review";
import { aiAllowed } from "@/lib/ai/run";
import { RatingSchema } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";
import { aiRating, aiRatingReject } from "@/app/ai-actions";
import { AiNotice } from "./AiNotice";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

/**
 * Staff: AI rating suggestion per criterion (high-risk). Shown next to, never inside, the person's
 * own rating form, so the recruiter rates actively instead of confirming defaults (automation bias).
 * Returns the id of the open suggestion so the rating form can log the decision on it.
 */
export async function loadOpenRating(applicationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_recommendations")
    .select("id, output, created_at, model, prompt_version")
    .eq("application_id", applicationId)
    .eq("kind", "scorecard_rating")
    .eq("status", "suggested")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function AiRatingPanel({ applicationId, organizationId, criteria, status }: { applicationId: string; organizationId: string; criteria: { id: string; name: string }[]; status?: string }) {
  const t = getMessages().ai;
  const allowed = await aiAllowed(organizationId, "scoring");
  const open = await loadOpenRating(applicationId);
  if (!allowed && !open) return null;
  const supabase = await createClient();
  const { data: answers } = await supabase.from("screening_answers").select("answer, screening_questions(question, position)").eq("application_id", applicationId);
  const parsed = open ? RatingSchema.safeParse(open.output) : null;
  const ratings = parsed?.success ? checkedRatings(parsed.data, criteria.map((c) => c.id), answersAsText(answers ?? [])) : [];
  const name = new Map(criteria.map((c) => [c.id, c.name]));

  return (
    <section id="ki-bewertung" aria-labelledby="ki-r-h" className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-violet-200 bg-white p-4">
      <h2 id="ki-r-h" className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-violet-700" aria-hidden="true" />{t.ratingTitle}</h2>
      <p className="text-sm text-ink/80">{t.ratingLead}</p>
      {status && <AiNotice status={status} />}
      {!allowed && <p className="text-sm text-muted">{t.ratingOff}</p>}
      {open && parsed?.success && (
        <>
          <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900"><span className="font-semibold">{t.badge} · {fmt.format(new Date(open.created_at))} · {open.model} · {open.prompt_version}:</span> {t.disclaimer}</p>
          <ul className="flex flex-col gap-2">
            {ratings.map((r) => (
              <li key={r.criterionId} className="rounded-lg border border-neutral-200 p-3">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{name.get(r.criterionId)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${r.rating === null ? "bg-neutral-100 text-muted" : "bg-violet-100 text-violet-900"}`}>{r.rating === null ? t.noEvidence : `${r.rating} / 5`}</span>
                </p>
                <p className="mt-1 text-sm text-ink/80">{r.reasoning}</p>
                {r.downgraded && <p className="mt-1 text-xs text-amber-900">{t.downgraded}</p>}
                {r.evidence.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {r.evidence.map((e, i) => (
                      <li key={i} className="border-l-2 border-violet-300 pl-2 text-sm">
                        „{e.quote}“ <span className="text-xs text-muted">– {e.source} · {r.verified[i] ? t.verified : t.unverified}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <form action={aiRatingReject}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="recId" value={open.id} />
            <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-red-50">{t.rejectRating}</button>
          </form>
        </>
      )}
      {allowed && !open && (
        <form action={aiRating}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-violet-900 hover:bg-violet-100"><Sparkles className="h-4 w-4" aria-hidden="true" />{t.ratingButton}</button>
        </form>
      )}
    </section>
  );
}

import { getMessages } from "@/i18n";
import { loadScorecard } from "@/lib/scorecard/load";
import { createClient } from "@/lib/supabase/server";
import { answerFeedbackRequest } from "@/app/application-actions";
import { Notice } from "./Notice";
import { FeedbackAnswerForm } from "./FeedbackAnswerForm";
import { defaultTemplate, feedbackTemplates } from "@/lib/feedback/templates";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

/** Staff: a rejected candidate asked for a reason. The draft is built from the job-related scorecard reasons. */
export async function FeedbackRequestBox({ applicationId, status }: { applicationId: string; status?: string }) {
  const t = getMessages().feedbackRequest;
  const supabase = await createClient();
  const [{ data: req }, { data: app }] = await Promise.all([
    supabase.from("feedback_requests").select("requested_at, answered_at, answer").eq("application_id", applicationId).maybeSingle(),
    supabase.from("applications").select("vacancies(organizations(candidate_tone))").eq("id", applicationId).maybeSingle(),
  ]);
  if (!req) return null;
  const sc = req.answered_at ? null : await loadScorecard(applicationId);
  const weak = (sc?.criteria ?? []).filter((c) => c.rating !== null && c.rating <= 2).map((c) => ({ name: c.name, reason: c.reason }));
  const tone = app?.vacancies?.organizations?.candidate_tone === "du" ? "du" : "sie";
  const templates = feedbackTemplates(tone, weak);
  return (
    <section id="feedback-anfrage" aria-labelledby="fr-h" className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-amber-200 bg-white p-4">
      <h2 id="fr-h" className="text-xl font-semibold">{t.title}</h2>
      <p className="text-sm text-muted">{t.requested(fmt.format(new Date(req.requested_at)))}</p>
      {status && t.notices[status] && <Notice kind={status === "sent" ? "ok" : "error"}>{t.notices[status]}</Notice>}
      {req.answered_at ? (
        <>
          <p className="text-sm text-emerald-800">{t.answered(fmt.format(new Date(req.answered_at)))}</p>
          <p className="whitespace-pre-line rounded-lg bg-canvas p-3 text-sm">{req.answer}</p>
        </>
      ) : (
        <>
          <p className="text-sm text-ink/80">{t.lead}</p>
          <FeedbackAnswerForm applicationId={applicationId} templates={templates} initial={defaultTemplate(templates)} action={answerFeedbackRequest} send={t.send} />
        </>
      )}
    </section>
  );
}

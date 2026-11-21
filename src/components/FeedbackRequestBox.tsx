import { getMessages } from "@/i18n";
import { loadScorecard } from "@/lib/scorecard/load";
import { createClient } from "@/lib/supabase/server";
import { answerFeedbackRequest } from "@/app/application-actions";
import { Notice } from "./Notice";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

/** Staff: a rejected candidate asked for a reason. The draft is built from the job-related scorecard reasons. */
export async function FeedbackRequestBox({ applicationId, status }: { applicationId: string; status?: string }) {
  const t = getMessages().feedbackRequest;
  const supabase = await createClient();
  const { data: req } = await supabase.from("feedback_requests").select("requested_at, answered_at, answer").eq("application_id", applicationId).maybeSingle();
  if (!req) return null;
  const sc = req.answered_at ? null : await loadScorecard(applicationId);
  const weak = (sc?.criteria ?? []).filter((c) => c.rating !== null && c.rating <= 2);
  const draft = weak.length
    ? `${t.draftIntro}\n\n${weak.map((c) => `– ${c.name}${c.reason ? `: ${c.reason}` : ""}`).join("\n")}`
    : t.draftEmpty;
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
        <form action={answerFeedbackRequest} className="flex flex-col gap-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="text-sm text-ink/80">{t.lead}</p>
          <textarea name="answer" rows={7} minLength={20} maxLength={3000} defaultValue={draft} className="rounded-lg border border-neutral-300 px-3 py-2" />
          <button type="submit" className="self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.send}</button>
        </form>
      )}
    </section>
  );
}

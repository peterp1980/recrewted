import type { Metadata } from "next";
import { getMessages } from "@/i18n";
import { Notice } from "@/components/Notice";
import { verifySurveyToken } from "@/lib/survey/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { answerSurvey } from "@/app/survey-actions";

export const metadata: Metadata = { title: "Kurze Frage – recrewted", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SurveyPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ token }, { s }] = await Promise.all([params, searchParams]);
  const t = getMessages().survey;
  const secret = process.env.DATA_REQUEST_SECRET;
  const app = secret ? verifySurveyToken(token, secret) : null;
  const { data: row } = app ? await createAdminClient().from("candidate_surveys").select("answered_at").eq("application_id", app).maybeSingle() : { data: null };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t.title}</h1>
      {!row ? (
        <Notice kind="info">{t.invalid}</Notice>
      ) : s === "thanks" || s === "done" || row.answered_at ? (
        <Notice kind="ok">{t.thanks}</Notice>
      ) : (
        <form action={answerSurvey} className="card flex flex-col gap-5">
          <input type="hidden" name="token" value={token} />
          {s === "invalid" && <Notice kind="error">{t.pick}</Notice>}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-lg font-semibold">{t.question}</legend>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-neutral-200 p-3 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
                  <input type="radio" name="score" value={n} required className="sr-only" />
                  <span className="font-display text-2xl font-bold">{n}</span>
                </label>
              ))}
            </div>
            <p className="flex justify-between text-xs text-muted"><span>{t.low}</span><span>{t.high}</span></p>
          </fieldset>
          <label className="grid gap-1">
            <span className="font-medium">{t.comment}</span>
            <textarea name="comment" rows={3} maxLength={1000} className="rounded-lg border border-neutral-300 px-3 py-2" />
            <span className="text-xs text-muted">{t.commentHint}</span>
          </label>
          <button type="submit" className="btn-primary self-start">{t.send}</button>
          <p className="text-xs text-muted">{t.privacy}</p>
        </form>
      )}
    </main>
  );
}

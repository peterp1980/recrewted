import { MessageSquare } from "lucide-react";
import { getMessages } from "@/i18n";
import { isProvider, PROVIDER_INFO } from "@/lib/ats/providers";
import { createClient } from "@/lib/supabase/server";
import { addComment } from "@/app/comment-actions";
import { Notice } from "./Notice";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

type Item = { at: string; kind: "comment" | "event"; text: string; author?: string | null; side?: string; badge?: string };

/** Comments with mentions plus a timeline of what happened with the application. */
export async function CandidateComments({ applicationId, staff, status }: { applicationId: string; staff: boolean; status?: string }) {
  const m = getMessages();
  const t = m.comments;
  const supabase = await createClient();
  const [{ data: comments }, { data: people }, { data: app }, { data: feedback }, { data: tests }, { data: transfers }] = await Promise.all([
    supabase.from("application_comments").select("body, kind, author_name, author_side, created_at").eq("application_id", applicationId).order("created_at"),
    supabase.rpc("mentionable", { app: applicationId }),
    supabase.from("applications").select("submitted_at, shortlisted_at, hired_at").eq("id", applicationId).maybeSingle(),
    supabase.from("customer_feedback").select("verdict, reason, created_at").eq("application_id", applicationId),
    supabase.from("assessment_attempts").select("submitted_at").eq("application_id", applicationId).not("submitted_at", "is", null),
    supabase.from("ats_transfers").select("provider, sent_at").eq("application_id", applicationId).not("sent_at", "is", null),
  ]);

  const items: Item[] = [
    ...(comments ?? []).map((c): Item => ({
      at: c.created_at, kind: "comment", text: c.body, author: c.author_name, side: c.author_side,
      badge: c.kind === "internal" ? t.internalBadge : c.kind === "question" ? t.questionBadge : undefined,
    })),
    ...(app?.submitted_at ? [{ at: app.submitted_at, kind: "event" as const, text: t.events.submitted }] : []),
    ...(app?.shortlisted_at ? [{ at: app.shortlisted_at, kind: "event" as const, text: t.events.shortlisted }] : []),
    ...(app?.hired_at ? [{ at: app.hired_at, kind: "event" as const, text: t.events.hired }] : []),
    ...(feedback ?? []).map((f): Item => ({ at: f.created_at, kind: "event", text: `${t.events.feedback(m.feedback.verdicts[f.verdict as keyof typeof m.feedback.verdicts] ?? f.verdict)}${f.reason ? ` – „${f.reason}“` : ""}` })),
    ...(tests ?? []).map((x): Item => ({ at: x.submitted_at!, kind: "event", text: t.events.test })),
    ...(transfers ?? []).map((x): Item => ({ at: x.sent_at!, kind: "event", text: t.events.ats(isProvider(x.provider) ? PROVIDER_INFO[x.provider].name.replace(/ \(.*\)$/, "") : "ATS") })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const kinds = staff ? ["comment", "internal"] : ["comment", "question"];
  return (
    <section id="kommentare" aria-labelledby="cm-h" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="cm-h" className="text-xl font-semibold">{t.title}</h2>
      <p className="text-sm text-ink/80">{t.lead}</p>
      {status && t.notices[status] && <Notice kind={status === "saved" ? "ok" : "error"}>{t.notices[status]}</Notice>}
      {items.length === 0 ? (
        <p className="text-muted">{t.empty}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((it, i) =>
            it.kind === "event" ? (
              <li key={i} className="flex gap-3 text-sm text-muted">
                <span className="w-36 shrink-0 tabular-nums">{fmt.format(new Date(it.at))}</span>
                <span>{it.text}</span>
              </li>
            ) : (
              <li key={i} className={`rounded-xl p-3 ${it.badge === t.internalBadge ? "bg-amber-50" : it.side === "recrewted" ? "bg-brand-50" : "bg-neutral-50"}`}>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted" aria-hidden="true" />
                  <span className="font-medium">{it.author}</span>
                  <span className="text-muted">{t.sides[it.side ?? "customer"]} · {fmt.format(new Date(it.at))}</span>
                  {it.badge && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">{it.badge}</span>}
                </p>
                <p className="mt-1 whitespace-pre-line">{it.text}</p>
              </li>
            ),
          )}
        </ol>
      )}
      <form action={addComment} className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
        <input type="hidden" name="applicationId" value={applicationId} />
        <label className="sr-only" htmlFor="cm-body">{t.placeholder}</label>
        <textarea id="cm-body" name="body" required maxLength={4000} rows={3} placeholder={t.placeholder} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
        <div className="flex flex-wrap gap-4">
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium">{t.kind}</legend>
            {kinds.map((k, i) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="radio" name="kind" value={k} defaultChecked={i === 0} /> {t.kinds[k]}</label>
            ))}
          </fieldset>
          {(people ?? []).length > 0 && (
            <fieldset className="flex flex-col gap-1">
              <legend className="text-sm font-medium">{t.mention}</legend>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-2">
                {(people ?? []).map((p) => (
                  <label key={`${p.side}-${p.profile_id}`} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="mention" value={p.profile_id} /> {p.full_name} <span className="text-muted">({t.sides[p.side]})</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
        <button type="submit" className="self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.send}</button>
      </form>
    </section>
  );
}

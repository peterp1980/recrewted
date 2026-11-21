import { getMessages } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { cancelMail, sendCandidateMail } from "@/app/application-actions";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

/** Mail templates sent from the pipeline (F5) and the queue for this application. */
export async function CandidateMail({ applicationId, hasEmail }: { applicationId: string; hasEmail: boolean }) {
  const t = getMessages().mail;
  const supabase = await createClient();
  const { data: mails } = await supabase.from("mail_outbox").select("id, template, send_after, sent_at, cancelled_at, last_error").eq("application_id", applicationId).order("created_at");
  const label = (tpl: string) => (tpl in t.templates ? t.templates[tpl as keyof typeof t.templates] : tpl === "application_received" ? "Eingangsbestätigung" : tpl === "knockout_rejection" ? "Absage (Ausschlussfrage)" : tpl);

  return (
    <section aria-labelledby="mail-h" className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
      <h2 id="mail-h" className="text-xl font-semibold">{t.title}</h2>
      {hasEmail ? (
        <form action={sendCandidateMail} className="grid gap-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <label className="grid gap-1">
            <span>{t.template}</span>
            <select name="template" className="rounded-md border border-neutral-400 px-3 py-2">
              {(Object.keys(t.templates) as (keyof typeof t.templates)[]).map((k) => <option key={k} value={k}>{t.templates[k]}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span>{t.message}</span>
            <span className="text-sm text-neutral-600">{t.messageHint}</span>
            <textarea name="message" rows={4} maxLength={3000} className="rounded-md border border-neutral-400 px-3 py-2" />
          </label>
          <button type="submit" className="justify-self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">{t.send}</button>
        </form>
      ) : (
        <p className="text-neutral-700">{t.noEmail}</p>
      )}
      {mails && mails.length > 0 && (
        <div>
          <h3 className="font-medium">{t.queue}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {mails.map((mm) => (
              <li key={mm.id} className="flex flex-wrap items-center gap-2">
                <span>{label(mm.template)}</span>
                <span className="text-neutral-600">
                  {mm.cancelled_at ? t.cancelled : mm.sent_at ? `${t.sentAt} ${fmt.format(new Date(mm.sent_at))}` : `${t.queued} ${fmt.format(new Date(mm.send_after))}`}
                  {mm.last_error && !mm.sent_at ? ` · ${t.failed}` : ""}
                </span>
                {!mm.sent_at && !mm.cancelled_at && (
                  <form action={cancelMail}>
                    <input type="hidden" name="applicationId" value={applicationId} />
                    <input type="hidden" name="mailId" value={mm.id} />
                    <button type="submit" className="rounded border border-neutral-400 px-2 py-0.5 hover:bg-neutral-100">{t.cancel}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

import { getMessages } from "@/i18n";
import { isProvider, PROVIDER_INFO } from "@/lib/ats/providers";
import { createClient } from "@/lib/supabase/server";
import { transferToAts } from "@/app/ats-actions";
import { Notice } from "./Notice";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

/** On an application: state of the handover to the customer's ATS and a button to do it now. */
export async function AtsTransferBox({ applicationId, vacancyId, status, showWhenOff = false }: { applicationId: string; vacancyId: string; status?: string; showWhenOff?: boolean }) {
  const t = getMessages().ats.box;
  const supabase = await createClient();
  const { data: v } = await supabase.from("vacancies").select("organization_id, ats_job_id").eq("id", vacancyId).single();
  if (!v) return null;
  const [{ data: conn }, { data: transfer }] = await Promise.all([
    supabase.from("ats_connections").select("provider, enabled").eq("organization_id", v.organization_id).maybeSingle(),
    supabase.from("ats_transfers").select("status, error, sent_at, created_at").eq("application_id", applicationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const on = conn?.enabled && isProvider(conn.provider);
  if (!on && !transfer && !showWhenOff) return null;
  const name = conn && isProvider(conn.provider) ? PROVIDER_INFO[conn.provider].name.replace(/ \(.*\)$/, "") : "ATS";

  return (
    <section id="ats" aria-labelledby="ats-box-h" className="flex scroll-mt-20 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="ats-box-h" className="text-xl font-semibold">{t.title}</h2>
      {status && t.notices[status] && <Notice kind={status === "done" ? "ok" : status === "already" ? "info" : "error"}>{t.notices[status]}</Notice>}
      {transfer && (
        <p className={transfer.status === "failed" ? "text-red-800" : transfer.status === "sent" ? "text-emerald-800" : ""}>
          {name}: {t.status[transfer.status] ?? transfer.status}
          {transfer.sent_at && ` (${fmt.format(new Date(transfer.sent_at))})`}
          {transfer.error && <span className="block text-sm">{transfer.error}</span>}
        </p>
      )}
      {!on ? (
        <p className="text-muted">{t.off}</p>
      ) : (
        <>
          {!v.ats_job_id && conn?.provider !== "webhook" && <p className="text-sm text-amber-900">{t.noJob}</p>}
          {transfer?.status !== "sent" && transfer?.status !== "pending" && (
            <form action={transferToAts}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{transfer?.status === "failed" ? t.retry : t.button(name)}</button>
            </form>
          )}
        </>
      )}
    </section>
  );
}

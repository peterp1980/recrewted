import { getMessages } from "@/i18n";
import { isProvider, PROVIDER_INFO, PROVIDERS } from "@/lib/ats/providers";
import { createClient } from "@/lib/supabase/server";
import { removeAtsConnection, saveAtsConnection, saveAtsJobIds, testAtsConnection } from "@/app/ats-actions";
import { Notice } from "./Notice";
import { ProviderFields } from "./ProviderFields";

const field = "w-full rounded-lg border border-neutral-300 px-3 py-2";
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

type Props = { organizationId: string; from: "admin" | "portal"; status?: string; msg?: string; field?: string };

/** ATS connection of one customer: switch, system, key, trigger, test and job mapping. */
export async function AtsSection({ organizationId, from, status, msg, field: badField }: Props) {
  const t = getMessages().ats;
  const supabase = await createClient();
  const [{ data: conn }, { data: vacancies }] = await Promise.all([
    supabase.from("ats_connections").select("provider, enabled, trigger_on, config, secret_hint, last_test_at, last_test_ok, last_error, remote_jobs").eq("organization_id", organizationId).maybeSingle(),
    supabase.from("vacancies").select("id, title, status, ats_job_id").eq("organization_id", organizationId).neq("status", "closed").order("created_at", { ascending: false }),
  ]);
  const provider = conn && isProvider(conn.provider) ? conn.provider : "personio";
  const info = PROVIDER_INFO[provider];
  const config = (conn?.config ?? {}) as Record<string, string>;
  const remoteJobs = (Array.isArray(conn?.remote_jobs) ? conn.remote_jobs : []) as { id: string; title: string }[];
  const hidden = (
    <>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="from" value={from} />
    </>
  );
  const ok = ["saved", "tested", "removed", "jobs"].includes(status ?? "");
  // RegExps cannot cross to the client component; the server validates anyway.
  const infos = Object.fromEntries(PROVIDERS.map((p) => [p, { ...PROVIDER_INFO[p], fields: PROVIDER_INFO[p].fields.map((f) => ({ key: f.key, label: f.label, hint: f.hint, required: f.required })) }]));

  return (
    <section id="ats" aria-labelledby="ats-h" className="card flex scroll-mt-20 flex-col gap-4">
      <h2 id="ats-h" className="text-lg font-semibold">{t.title}</h2>
      <p className="max-w-3xl text-ink/80">{t.lead}</p>
      {status && t.notices[status] && (
        <Notice kind={ok ? "ok" : "error"}>
          {t.notices[status]}
          {badField && ` (${badField})`}
          {msg && <span className="mt-1 block text-sm">{msg}</span>}
        </Notice>
      )}

      <form action={saveAtsConnection} className="grid gap-4">
        {hidden}
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" name="enabled" defaultChecked={conn?.enabled ?? false} className="h-5 w-5" /> {t.enabled}
        </label>
        <ProviderFields
          providers={infos}
          initial={provider}
          config={config}
          keyHint={conn?.secret_hint ?? null}
          savedProvider={conn ? provider : null}
          labels={{ provider: t.provider, key: t.key, keyStored: conn?.secret_hint ? t.keyStored(conn.secret_hint) : "", keyNote: t.keyNote }}
        />
        <label className="grid gap-1">
          <span className="font-medium">{t.trigger}</span>
          <select name="trigger" defaultValue={conn?.trigger_on ?? "interview"} className={field}>
            {Object.entries(t.triggers).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.save}</button>
        </div>
      </form>

      {conn && (
        <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 text-sm">
          {conn.last_test_at && <p>{t.lastTest(fmt.format(new Date(conn.last_test_at)), Boolean(conn.last_test_ok))}</p>}
          {conn.last_error && <p className="text-red-800">{t.lastError}: {conn.last_error}</p>}
          <div className="flex flex-wrap gap-2">
            <form action={testAtsConnection}>{hidden}<button type="submit" className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 hover:bg-brand-50">{t.test}</button></form>
            <form action={removeAtsConnection}>{hidden}<button type="submit" className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-red-800 hover:bg-red-50">{t.remove}</button></form>
          </div>
        </div>
      )}
      <p className="text-sm text-muted">{t.otherSystems}</p>

      {conn && (
        <form action={saveAtsJobIds} className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
          {hidden}
          <h3 className="font-semibold">{t.jobsTitle}</h3>
          <p className="text-sm text-ink/80">{t.jobsLead}</p>
          {(vacancies ?? []).length === 0 ? (
            <p className="text-muted">{t.noVacancies}</p>
          ) : (
            <div className="grid gap-2">
              {(vacancies ?? []).map((v) => (
                <label key={v.id} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3">
                  <span className="text-sm font-medium">{v.title}</span>
                  {remoteJobs.length ? (
                    <select name={`job_${v.id}`} defaultValue={v.ats_job_id ?? ""} className={field}>
                      <option value="">{t.jobNone}</option>
                      {v.ats_job_id && !remoteJobs.some((j) => j.id === v.ats_job_id) && <option value={v.ats_job_id}>{v.ats_job_id}</option>}
                      {remoteJobs.map((j) => <option key={j.id} value={j.id}>{j.title} ({j.id})</option>)}
                    </select>
                  ) : (
                    <input name={`job_${v.id}`} defaultValue={v.ats_job_id ?? ""} placeholder={info.jobIdLabel} maxLength={100} className={field} />
                  )}
                </label>
              ))}
            </div>
          )}
          {(vacancies ?? []).length > 0 && <button type="submit" className="self-start rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.saveJobs}</button>}
        </form>
      )}
    </section>
  );
}

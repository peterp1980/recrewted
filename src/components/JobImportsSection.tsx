import Link from "next/link";
import { addImportSource, deleteImportSource, runImportNow, toggleImportSource } from "@/app/import-actions";
import { getSession } from "@/lib/auth/session";
import { IMPORT_PROVIDERS, isImportProvider } from "@/lib/imports/providers";
import type { RunResult } from "@/lib/imports/run";
import { createClient } from "@/lib/supabase/server";

const MSG: Record<string, [string, boolean]> = {
  added: ["Quelle angelegt und einmal abgerufen.", true],
  ran: ["Abgerufen.", true],
  saved: ["Gespeichert.", true],
  deleted: ["Quelle entfernt. Bereits angelegte Entwürfe bleiben.", true],
  invalid: ["Bitte Anbieter und Firmenname bzw. eine https-Adresse prüfen.", false],
  duplicate: ["Diese Quelle gibt es für den Kunden schon.", false],
  forbidden: ["Importe verwalten nur Admins.", false],
  error: ["Das hat nicht geklappt.", false],
};
const field = "rounded-lg border border-neutral-300 px-3 py-2";
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

/** Customer's own jobs from their applicant tracking system or career page, imported as drafts. */
export async function JobImportsSection({ organizationId, status }: { organizationId: string; status?: string }) {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const supabase = await createClient();
  const [{ data: sources }, { data: sw }] = await Promise.all([
    supabase.from("job_imports").select("id, provider, source, enabled, last_run_at, last_result, imported_jobs(id, title, url, vacancy_id, gone_at, first_seen_at, vacancies(status))").eq("organization_id", organizationId).order("created_at"),
    supabase.from("feature_switches").select("enabled").eq("key", "import_customer_jobs").maybeSingle(),
  ]);
  const msg = status ? MSG[status] : null;
  return (
    <section id="import" aria-labelledby="imp-h" className="card flex scroll-mt-20 flex-col gap-4">
      <h2 id="imp-h" className="text-lg font-semibold">Stellen des Kunden importieren</h2>
      <p className="text-sm text-muted">Holt die Stellen aus dem Bewerbermanagement oder von der Karriereseite des Kunden – im Auftrag des Kunden. Neue Stellen werden <b>Entwürfe</b> mit vorausgefülltem Briefing; ein Recruiter prüft, ergänzt Ausschlussfragen und Kriterien und gibt frei. Abruf täglich und auf Knopfdruck.</p>
      {sw && !sw.enabled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Der Import ist für alle ausgeschaltet (<Link href="/admin/kanaele#import" className="underline">Admin → Kanäle</Link>).</p>}
      {msg && <p role="status" className={`rounded-lg p-3 text-sm ${msg[1] ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg[0]}</p>}

      {(sources ?? []).map((s) => {
        const r = s.last_result as RunResult | null;
        const jobs = (s.imported_jobs ?? []).sort((a, b) => b.first_seen_at.localeCompare(a.first_seen_at));
        return (
          <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{isImportProvider(s.provider) ? IMPORT_PROVIDERS[s.provider].name : s.provider}: <span className="font-mono text-sm">{s.source}</span> {!s.enabled && <span className="text-sm text-muted">(aus)</span>}</p>
              {isAdmin && (
                <div className="flex flex-wrap gap-3 text-sm">
                  <form action={runImportNow}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="importId" value={s.id} /><button className="font-semibold text-brand-800 underline">Jetzt abrufen</button></form>
                  <form action={toggleImportSource}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="importId" value={s.id} />{!s.enabled && <input type="hidden" name="enabled" value="on" />}<button className="underline">{s.enabled ? "Ausschalten" : "Einschalten"}</button></form>
                  <form action={deleteImportSource}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="importId" value={s.id} /><button className="text-muted underline">Entfernen</button></form>
                </div>
              )}
            </div>
            <p className="text-sm text-muted">
              {s.last_run_at ? `Zuletzt ${fmt.format(new Date(s.last_run_at))}: ` : "Noch nicht abgerufen."}
              {r && (r.error ? <span className="text-amber-800">{r.error}</span> : `${r.found} gefunden, ${r.created} neu angelegt, ${r.gone} nicht mehr gelistet`)}
            </p>
            {jobs.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {jobs.slice(0, 30).map((j) => (
                  <li key={j.id} className="flex flex-wrap gap-x-2">
                    {j.vacancy_id ? <Link href={`/admin/vacancies/${j.vacancy_id}`} className="underline">{j.title}</Link> : <span>{j.title}</span>}
                    <span className="text-muted">· {j.vacancies?.status === "draft" ? "Entwurf – bitte prüfen" : j.vacancies?.status ?? "Vakanz gelöscht"}</span>
                    {j.gone_at && <span className="text-amber-800">· beim Kunden nicht mehr gelistet</span>}
                    {j.url && <a href={j.url} target="_blank" rel="noopener noreferrer" className="text-muted underline">Quelle</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {isAdmin && (
        <form action={addImportSource} className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
          <input type="hidden" name="organizationId" value={organizationId} />
          <label className="grid gap-1"><span className="text-sm font-medium">Quelle</span>
            <select name="provider" className={field}>{Object.entries(IMPORT_PROVIDERS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}</select>
          </label>
          <label className="grid gap-1"><span className="text-sm font-medium">Firmenname oder Adresse</span><input name="source" required placeholder="z. B. hafermann oder https://…" className={field} /></label>
          <button className="btn-primary py-2">Hinzufügen und abrufen</button>
          <ul className="text-xs text-muted sm:col-span-3">
            {Object.values(IMPORT_PROVIDERS).map((p) => <li key={p.name}><b>{p.name}:</b> {p.hint}</li>)}
          </ul>
        </form>
      )}
    </section>
  );
}

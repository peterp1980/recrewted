import { ExternalLink } from "lucide-react";
import { createDeal, linkDeal, retryCrm, unlinkDeal } from "@/app/crm-actions";
import { crmConfig, dealUrl } from "@/lib/crm/pipedrive";
import { createClient } from "@/lib/supabase/server";

const MSG: Record<string, [string, boolean]> = {
  linked: ["Deal verknüpft. Statuswechsel der Vakanz erscheinen ab jetzt als Notiz am Deal.", true],
  created: ["Deal in Pipedrive angelegt und verknüpft.", true],
  unlinked: ["Verknüpfung gelöst.", true],
  retry: ["Wird erneut gesendet.", true],
  invalid: ["Bitte die Deal-Nummer oder den Link zum Deal eintragen.", false],
  notFound: ["Diesen Deal gibt es in Pipedrive nicht (oder der Token hat keinen Zugriff).", false],
  unreachable: ["Pipedrive ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.", false],
  rejected: ["Pipedrive hat den Deal abgelehnt. Bitte Pipeline- und Stage-ID prüfen.", false],
  notConfigured: ["Für das Anlegen fehlt der Pipedrive-API-Token in Vercel.", false],
  error: ["Speichern hat nicht geklappt.", false],
};
const STATE: Record<string, string> = { pending: "wartet", sent: "gesendet", failed: "fehlgeschlagen", skipped: "übersprungen" };
const field = "rounded-lg border border-neutral-300 px-3 py-2";

/** F15 on the staff vacancy page: deal link, create deal, sync log. */
export async function CrmBox({ vacancyId, status }: { vacancyId: string; status?: string }) {
  const supabase = await createClient();
  const [{ data: v }, { data: log }] = await Promise.all([
    supabase.from("vacancies").select("pipedrive_deal_id").eq("id", vacancyId).single(),
    supabase.from("crm_outbox").select("id, payload, status, error, created_at").eq("vacancy_id", vacancyId).order("created_at", { ascending: false }).limit(5),
  ]);
  const configured = crmConfig() !== null;
  const msg = status ? MSG[status] : null;
  const dealId = v?.pipedrive_deal_id ?? null;
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
  return (
    <section id="crm" aria-labelledby="crm-h" className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="crm-h" className="text-xl font-semibold">Pipedrive</h2>
      {msg && <p role="status" className={`rounded-lg p-3 text-sm ${msg[1] ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg[0]}</p>}
      {!configured && <p className="rounded-lg bg-neutral-100 p-3 text-sm text-ink/80">Noch kein API-Token hinterlegt: Verknüpfen geht schon, gesendet wird, sobald <code>PIPEDRIVE_API_TOKEN</code> in Vercel gesetzt ist.</p>}
      {dealId ? (
        <div className="flex flex-wrap items-center gap-3">
          <a href={dealUrl(Number(dealId))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-800 underline underline-offset-4">Deal {String(dealId)} öffnen <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
          <form action={unlinkDeal}><input type="hidden" name="vacancyId" value={vacancyId} /><button className="text-sm text-muted underline">Verknüpfung lösen</button></form>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">Vertrag unterschrieben (Vakanz wird aktiv) markiert den Deal als gewonnen. Aktiv, pausiert, besetzt und geschlossen kommen als Notiz an den Deal, mit Zahlen, ohne Bewerberdaten.</p>
          <form action={linkDeal} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <label className="grid gap-1"><span className="text-sm font-medium">Bestehender Deal (Nummer oder Link)</span><input name="dealId" required placeholder="z. B. 1234" className={field} /></label>
            <button className="btn-secondary py-2">Verknüpfen</button>
          </form>
          {configured && (
            <form action={createDeal}><input type="hidden" name="vacancyId" value={vacancyId} /><button className="btn-primary py-2">Neuen Deal in Pipeline „recrewted“ anlegen</button></form>
          )}
        </div>
      )}
      {(log ?? []).length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Zuletzt an Pipedrive</p>
          <ul className="text-sm text-ink/80">
            {(log ?? []).map((e) => {
              const p = e.payload as { from?: string; to?: string };
              return <li key={e.id}>{fmt.format(new Date(e.created_at))} · {p.from} → {p.to} · {STATE[e.status] ?? e.status}{e.error ? ` (${e.error})` : ""}</li>;
            })}
          </ul>
          {(log ?? []).some((e) => e.status === "failed") && (
            <form action={retryCrm}><input type="hidden" name="vacancyId" value={vacancyId} /><button className="text-sm font-semibold text-brand-800 underline">Fehlgeschlagene erneut senden</button></form>
          )}
        </div>
      )}
    </section>
  );
}

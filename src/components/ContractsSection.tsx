import { ExternalLink } from "lucide-react";
import { createContractAction, refreshContractAction, sendContractAction } from "@/app/contract-actions";
import { getSession } from "@/lib/auth/session";
import { fromStored } from "@/lib/briefing/schema";
import { documentUrl, pandadocConfigured } from "@/lib/contracts/pandadoc";
import { KIND_LABEL } from "@/lib/contracts/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const CONTRACT_MSG: Record<string, [string, boolean]> = {
  created: ["Dokument in PandaDoc angelegt. Prüfen und dann senden.", true],
  sent: ["Gesendet. Der Kunde bekommt eine E-Mail von PandaDoc mit dem Link zum Unterschreiben.", true],
  processing: ["PandaDoc bereitet das Dokument noch vor. Bitte in ein paar Sekunden erneut „Senden“ klicken.", false],
  refreshed: ["Status aktualisiert.", true],
  templateSaved: ["Vorlage gespeichert. Sie gilt ab sofort für neue Dokumente dieser Art.", true],
  templateRetired: ["Vorlage deaktiviert.", true],
  invalid: ["Bitte Art, Name und E-Mail der unterschreibenden Person prüfen.", false],
  forbidden: ["Angebote und Verträge erstellen und versenden nur Admins der projx GmbH.", false],
  error: ["Das hat nicht geklappt.", false],
};
const STATUS: Record<string, [string, string]> = {
  draft: ["Entwurf", "bg-neutral-100 text-ink/80"],
  sent: ["Gesendet", "bg-sky-50 text-sky-900"],
  viewed: ["Angesehen", "bg-amber-50 text-amber-900"],
  completed: ["Unterschrieben", "bg-emerald-50 text-emerald-900"],
  declined: ["Abgelehnt", "bg-red-50 text-red-900"],
  expired: ["Zurückgezogen", "bg-neutral-100 text-ink/70"],
};
const field = "rounded-lg border border-neutral-300 px-3 py-2";
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

/** Contracts of a customer or one vacancy. Admins create and send; recruiters only see. */
export async function ContractsSection({ organizationId, vacancyId, status, detail }: { organizationId: string; vacancyId?: string; status?: string; detail?: string }) {
  const session = await getSession();
  if (!session) return null;
  const isAdmin = session.role === "admin";
  const supabase = await createClient();
  let q = supabase.from("contracts").select("id, kind, name, status, recipient_name, recipient_email, sent_at, viewed_at, signed_at, storage_path, pandadoc_document_id, error, created_at, template_version").eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (vacancyId) q = q.eq("vacancy_id", vacancyId);
  const [{ data: rows }, { data: templates }, { data: vac }, { data: framework }] = await Promise.all([
    q,
    supabase.from("contract_templates").select("kind, name").eq("active", true),
    vacancyId ? supabase.from("vacancies").select("vacancy_briefings(data), price_eur").eq("id", vacancyId).single() : Promise.resolve({ data: null }),
    supabase.from("contracts").select("id").eq("organization_id", organizationId).eq("kind", "framework").eq("status", "completed").limit(1),
  ]);
  const links = await Promise.all((rows ?? []).filter((r) => r.storage_path).map(async (r) => [r.id, (await createAdminClient().storage.from("contracts").createSignedUrl(r.storage_path!, 300, { download: true })).data?.signedUrl] as const));
  const pdf = new Map(links);
  const briefing = vac ? fromStored((vac.vacancy_briefings as { data: unknown } | null)?.data) : null;
  const available = new Set((templates ?? []).map((t) => t.kind));
  const kinds = (vacancyId ? ["offer", "order_confirmation"] : ["framework", "terms", "dpa"]).filter((k) => available.has(k));
  const hasFramework = (framework ?? []).length > 0;
  const msg = status ? CONTRACT_MSG[status] : null;

  return (
    <section id="vertraege" aria-labelledby="vt-h" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="vt-h" className="text-xl font-semibold">{vacancyId ? "Angebot und Vertrag" : "Verträge"}</h2>
        <a href="/admin/vertraege" className="text-sm text-muted underline">Vorlagen und alle Verträge</a>
      </div>
      {msg && <p role="status" className={`rounded-lg p-3 text-sm ${msg[1] ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg[0]}{detail ? ` ${detail}` : ""}</p>}
      {vacancyId && <p className="text-sm text-muted">{hasFramework ? "Rahmenvertrag ist unterschrieben – eine Auftragsbestätigung reicht." : "Noch kein Rahmenvertrag: Angebot mit AGB und AV-Vertrag schicken, oder zuerst beim Unternehmen einen Rahmenvertrag."}</p>}

      {(rows ?? []).length > 0 ? (
        <ul className="flex flex-col divide-y divide-neutral-100">
          {(rows ?? []).map((r) => {
            const [label, tone] = STATUS[r.status] ?? [r.status, "bg-neutral-100"];
            return (
              <li key={r.id} className="flex flex-col gap-1.5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
                  <span className="font-medium">{r.name ?? KIND_LABEL[r.kind]}</span>
                </div>
                <p className="text-sm text-muted">
                  An {r.recipient_name} ({r.recipient_email}) · {r.template_version}
                  {r.sent_at ? ` · gesendet ${fmt.format(new Date(r.sent_at))}` : ""}
                  {r.viewed_at ? ` · angesehen ${fmt.format(new Date(r.viewed_at))}` : ""}
                  {r.signed_at ? ` · unterschrieben ${fmt.format(new Date(r.signed_at))}` : ""}
                </p>
                {r.error && <p className="text-sm text-amber-800">{r.error}</p>}
                <div className="flex flex-wrap gap-3 text-sm">
                  {pdf.get(r.id) && <a href={pdf.get(r.id)!} className="font-semibold text-brand-800 underline">Unterschriebenes PDF</a>}
                  {r.pandadoc_document_id && <a href={documentUrl(r.pandadoc_document_id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">In PandaDoc öffnen <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
                  {isAdmin && r.status === "draft" && r.pandadoc_document_id && (
                    <form action={sendContractAction}><input type="hidden" name="contractId" value={r.id} /><input type="hidden" name="organizationId" value={organizationId} />{vacancyId && <input type="hidden" name="vacancyId" value={vacancyId} />}<button className="font-semibold text-brand-800 underline">Jetzt senden</button></form>
                  )}
                  {isAdmin && r.pandadoc_document_id && r.status !== "completed" && (
                    <form action={refreshContractAction}><input type="hidden" name="contractId" value={r.id} /><input type="hidden" name="organizationId" value={organizationId} />{vacancyId && <input type="hidden" name="vacancyId" value={vacancyId} />}<button className="underline">Status abrufen</button></form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Noch keine Dokumente.</p>
      )}

      {isAdmin && (
        !pandadocConfigured() ? (
          <p className="rounded-lg bg-neutral-100 p-3 text-sm text-ink/80">Zum Erstellen fehlt noch der PandaDoc-API-Key (<code>PANDADOC_API_KEY</code> in Vercel).</p>
        ) : kinds.length === 0 ? (
          <p className="rounded-lg bg-neutral-100 p-3 text-sm text-ink/80">Noch keine passende Vorlage. <a href="/admin/vertraege" className="underline">Vorlagen hinterlegen</a></p>
        ) : (
          <form action={createContractAction} className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            {vacancyId && <input type="hidden" name="vacancyId" value={vacancyId} />}
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-sm font-medium">Dokument</span>
              <select name="kind" defaultValue={vacancyId && hasFramework && kinds.includes("order_confirmation") ? "order_confirmation" : kinds[0]} className={field}>
                {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
            <label className="grid gap-1"><span className="text-sm font-medium">Unterschreibt beim Kunden</span><input name="recipientName" required minLength={3} defaultValue={briefing?.contactName ?? ""} className={field} /></label>
            <label className="grid gap-1"><span className="text-sm font-medium">E-Mail</span><input name="recipientEmail" type="email" required defaultValue={briefing?.contactEmail ?? ""} className={field} /></label>
            <label className="grid gap-1 sm:col-span-2"><span className="text-sm font-medium">Nachricht in der E-Mail (optional)</span><textarea name="message" rows={3} maxLength={1000} placeholder="Guten Tag, anbei unser Angebot …" className={field} /></label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="countersign" className="h-4 w-4" /> projx zeichnet gegen (ich, {session.fullName ?? session.email}, nach dem Kunden)</label>
            {vacancyId && vac?.price_eur === null && <p className="text-sm text-amber-800 sm:col-span-2">Für diese Vakanz ist noch kein Preis eingetragen (Einstellungen). Der Platzhalter [Preis] bleibt sonst leer.</p>}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button name="send" value="now" className="btn-primary py-2">Erstellen und senden</button>
              <button name="send" value="later" className="btn-secondary py-2">Nur erstellen (in PandaDoc prüfen)</button>
            </div>
          </form>
        )
      )}
    </section>
  );
}

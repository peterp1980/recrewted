import Link from "next/link";
import { retireTemplateAction, saveTemplateAction } from "@/app/contract-actions";
import { CONTRACT_MSG } from "@/components/ContractsSection";
import { requireAccess } from "@/lib/auth/session";
import { pandadocConfigured } from "@/lib/contracts/pandadoc";
import { KIND_LABEL, TOKEN_HELP } from "@/lib/contracts/tokens";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

type Props = { searchParams: Promise<{ vt?: string }> };
const field = "rounded-lg border border-neutral-300 px-3 py-2";
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });
const STATUS: Record<string, string> = { draft: "Entwurf", sent: "Gesendet", viewed: "Angesehen", completed: "Unterschrieben", declined: "Abgelehnt", expired: "Zurückgezogen" };

/** F16: PandaDoc templates and all contracts. Admins edit, recruiters read. */
export default async function ContractsAdminPage({ searchParams }: Props) {
  const session = await requireAccess("/admin/vertraege");
  const { vt } = await searchParams;
  const isAdmin = session.role === "admin";
  const supabase = await createClient();
  const [{ data: templates }, { data: contracts }] = await Promise.all([
    supabase.from("contract_templates").select("*").order("active", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, name, kind, status, organization_id, vacancy_id, sent_at, signed_at, created_at, organizations(name)").order("created_at", { ascending: false }).limit(100),
  ]);
  const msg = vt ? CONTRACT_MSG[vt] : null;
  const open = (contracts ?? []).filter((c) => ["sent", "viewed"].includes(c.status));

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Angebote und Verträge</h1>
        <p className="mt-2 max-w-3xl text-ink/80">Admins der projx GmbH erstellen Angebote, Rahmenverträge und Auftragsbestätigungen aus PandaDoc-Vorlagen und senden sie an den Kunden. Der Kunde unterschreibt im Browser, ohne Konto. Danach liegt das PDF in der Kundenakte und im Kundenportal, und die Vakanz wird aktiv.</p>
      </div>
      {msg && <p role="status" className={`rounded-lg p-3 text-sm ${msg[1] ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg[0]}</p>}
      {!pandadocConfigured() && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">PandaDoc ist noch nicht verbunden: <code>PANDADOC_API_KEY</code> und <code>PANDADOC_WEBHOOK_KEY</code> fehlen in Vercel.</p>}

      <section aria-labelledby="open-h" className="card flex flex-col gap-3">
        <h2 id="open-h" className="text-xl font-semibold">Warten auf Unterschrift ({open.length})</h2>
        {open.length ? (
          <ul className="flex flex-col gap-1">
            {open.map((c) => (
              <li key={c.id}>
                <Link href={c.vacancy_id ? `/admin/vacancies/${c.vacancy_id}#vertraege` : `/admin/organizations/${c.organization_id}#vertraege`} className="underline">{c.name ?? KIND_LABEL[c.kind]}</Link>
                <span className="text-sm text-muted"> · {STATUS[c.status]}{c.sent_at ? ` seit ${fmt.format(new Date(c.sent_at))}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">Nichts offen.</p>}
      </section>

      <section aria-labelledby="tpl-h" className="card flex flex-col gap-4">
        <h2 id="tpl-h" className="text-xl font-semibold">Vorlagen</h2>
        <p className="text-sm text-muted">Je Dokumentart gilt immer die neueste aktive Vorlage. Jedes Dokument speichert, mit welcher Vorlage und Version es erstellt wurde.</p>
        <ul className="flex flex-col divide-y divide-neutral-100">
          {(templates ?? []).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{KIND_LABEL[t.kind]}</span>: {t.name} · Version {t.version}
                <span className="text-sm text-muted"> · Rollen: {t.customer_role}{t.projx_role ? ` / ${t.projx_role}` : ""} · {t.active ? "aktiv" : "inaktiv"}</span>
              </span>
              {isAdmin && t.active && (
                <form action={retireTemplateAction}><input type="hidden" name="templateId" value={t.id} /><button className="text-sm underline">Deaktivieren</button></form>
              )}
            </li>
          ))}
          {!(templates ?? []).length && <li className="py-2 text-sm text-muted">Noch keine Vorlagen.</li>}
        </ul>
        {isAdmin && (
          <form action={saveTemplateAction} className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
            <label className="grid gap-1"><span className="text-sm font-medium">Dokumentart</span>
              <select name="kind" className={field}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
            <label className="grid gap-1"><span className="text-sm font-medium">Name</span><input name="name" required placeholder="Angebot recrewted 2026" className={field} /></label>
            <label className="grid gap-1 sm:col-span-2"><span className="text-sm font-medium">PandaDoc-Vorlage (ID oder Link)</span><input name="templateId" required placeholder="https://app.pandadoc.com/a/#/templates/…" className={field} /></label>
            <label className="grid gap-1"><span className="text-sm font-medium">Rolle des Kunden in der Vorlage</span><input name="customerRole" defaultValue="Kunde" className={field} /></label>
            <label className="grid gap-1"><span className="text-sm font-medium">Rolle projx (für Gegenzeichnung, optional)</span><input name="projxRole" placeholder="projx" className={field} /></label>
            <label className="grid gap-1"><span className="text-sm font-medium">Version</span><input name="version" defaultValue="1" className={field} /></label>
            <button className="btn-primary self-end justify-self-start py-2">Vorlage speichern</button>
          </form>
        )}
      </section>

      <section aria-labelledby="tok-h" className="card flex flex-col gap-3">
        <h2 id="tok-h" className="text-xl font-semibold">Platzhalter für die Vorlagen</h2>
        <p className="text-sm text-muted">In PandaDoc als Variable in eckigen Klammern einfügen, z. B. <code>[Kunde.Firma]</code>. recrewted füllt sie beim Erstellen.</p>
        <table className="w-full text-left text-sm">
          <tbody>
            {TOKEN_HELP.map(([k, d]) => <tr key={k} className="border-t border-neutral-100"><td className="py-1.5 pr-4 font-mono">[{k}]</td><td className="py-1.5 text-ink/80">{d}</td></tr>)}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="wh-h" className="card flex flex-col gap-2 text-sm">
        <h2 id="wh-h" className="text-xl font-semibold">Einrichtung in PandaDoc (einmalig)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-ink/80">
          <li>Settings → Integrations → API: API-Key erzeugen und in Vercel als <code>PANDADOC_API_KEY</code> (Typ „Sensitive“) eintragen.</li>
          <li>Settings → Integrations → Webhooks: neuer Webhook auf <code>{siteUrl()}/api/pandadoc/webhook</code>, Ereignis „Document state changed“. Den angezeigten Shared Key in Vercel als <code>PANDADOC_WEBHOOK_KEY</code> eintragen.</li>
          <li>Vorlagen mit den Rollen „Kunde“ (und optional „projx“) und den Platzhaltern oben anlegen, dann hier hinterlegen.</li>
        </ol>
      </section>

      <section aria-labelledby="all-h" className="card flex flex-col gap-2">
        <h2 id="all-h" className="text-xl font-semibold">Alle Dokumente</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {(contracts ?? []).map((c) => (
            <li key={c.id}>
              <Link href={c.vacancy_id ? `/admin/vacancies/${c.vacancy_id}#vertraege` : `/admin/organizations/${c.organization_id}#vertraege`} className="underline">{c.name ?? KIND_LABEL[c.kind]}</Link>
              <span className="text-muted"> · {STATUS[c.status] ?? c.status} · {fmt.format(new Date(c.created_at))}{c.signed_at ? ` · unterschrieben ${fmt.format(new Date(c.signed_at))}` : ""}</span>
            </li>
          ))}
          {!(contracts ?? []).length && <li className="text-muted">Noch keine.</li>}
        </ul>
      </section>
    </main>
  );
}

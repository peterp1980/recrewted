import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { aiConfig, modelLabel } from "@/lib/ai/config";
import { PROMPTS, type AiKind } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "KI – recrewted" };

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

// Register of AI functions (EU AI Act: deployer duties – human oversight, logs, monitoring, information).
const REGISTER: { kind: AiKind; name: string; purpose: string; risk: string; data: string; oversight: string }[] = [
  {
    kind: "job_ad_text", name: "Anzeigen-Entwurf", purpose: "Anzeigentext aus dem Briefing formulieren",
    risk: "Recruiting-Kontext; kein Einfluss auf Personen-Auswahl", data: "Briefing ohne Kontaktdaten",
    oversight: "Entwurf als Version; automatische Prüfung (m/w/d, Gehalt, AGG); Freigabe durch Recruiter",
  },
  {
    kind: "criteria_suggestion", name: "Kriterien- und Fragen-Vorschläge", purpose: "Bewertungskriterien und Formularfragen aus dem Briefing",
    risk: "Recruiting-Kontext; legt Auswahlkriterien nahe", data: "Briefing ohne Kontaktdaten",
    oversight: "AGG- und Stellvertreter-Filter; Recruiter wählt einzeln aus; Ausschlussfragen nur durch bewusstes Ankreuzen",
  },
  {
    kind: "interview_guide", name: "Gesprächsleitfaden", purpose: "Strukturierte Fragen je Kriterium, unzulässige Fragen markiert",
    risk: "gering; keine Kandidatendaten", data: "Stellentitel und Kriterien",
    oversight: "Recruiter übernimmt oder verwirft",
  },
  {
    kind: "scorecard_rating", name: "Bewertungsvorschlag je Kriterium", purpose: "Stufe 1–5 je Kriterium mit wörtlichem Beleg aus Lebenslauf und Fragebogen",
    risk: "Hochrisiko (EU AI Act, Anhang III Nr. 4 b)", data: "Lebenslauf (PDF/Bild), Antworten im Fragebogen; kein Name, keine Kontaktdaten",
    oversight: "Nur mit Freischaltung je Kunde; ohne Beleg keine Stufe; Zitate aus dem Fragebogen automatisch geprüft; Vorschlag steht neben – nicht im – Bewertungsbogen; Recruiter bewertet selbst; Abweichung wird überwacht",
  },
];

export default async function AiRegisterPage() {
  await requireAccess("/admin/ki");
  const cfg = aiConfig();
  const supabase = await createClient();
  const [{ data: stats }, { data: recent }] = await Promise.all([
    supabase.rpc("ai_monitoring", {}),
    supabase.from("ai_recommendations").select("id, kind, model, prompt_version, status, created_at, latency_ms, error, organizations(name)").order("created_at", { ascending: false }).limit(30),
  ]);
  const byKind = new Map((stats ?? []).map((s) => [s.kind, s]));
  const n = (v: unknown) => Number(v ?? 0);
  const STATUS: Record<string, string> = { suggested: "offen", accepted: "übernommen", modified: "geändert übernommen", rejected: "verworfen", failed: "fehlgeschlagen" };

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">KI-Register und Überwachung</h1>
        <p className="mt-1 max-w-3xl text-ink/80">Alle KI-Funktionen von recrewted. Die KI macht nur Vorschläge; jede Entscheidung trifft ein Mensch und wird mit dem Vorschlag protokolliert (Zeitpunkt, Modell, Prompt-Version, Prüfsumme der Eingabe).</p>
      </div>
      <section className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Betrieb</h2>
        <p>{cfg ? <>Eingeschaltet · <code className="text-sm">{modelLabel(cfg)}</code></> : <>{getMessages().ai.off} Einschalten über <code>AI_ENABLED=true</code> (siehe docs/ki.md).</>}</p>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Funktionen</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2 pr-3">Funktion</th><th className="py-2 pr-3">Zweck</th><th className="py-2 pr-3">Risiko</th><th className="py-2 pr-3">Daten</th><th className="py-2 pr-3">Menschliche Aufsicht</th><th className="py-2 pr-3">Prompt</th></tr></thead>
            <tbody className="divide-y divide-neutral-200 align-top">
              {REGISTER.map((r) => (
                <tr key={r.kind}>
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="py-2 pr-3">{r.purpose}</td>
                  <td className={`py-2 pr-3 ${r.kind === "scorecard_rating" ? "font-semibold text-accent-700" : ""}`}>{r.risk}</td>
                  <td className="py-2 pr-3">{r.data}</td>
                  <td className="py-2 pr-3">{r.oversight}</td>
                  <td className="py-2 pr-3"><code className="text-xs">{PROMPTS[r.kind].version}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Überwachung (letzte 90 Tage)</h2>
        <p className="text-sm text-muted">Viele unveränderte Übernahmen bei Bewertungen können auf blindes Vertrauen hindeuten; große Abweichungen auf schlechte Vorschläge. Beides ist ein Anlass, Stichproben anzusehen.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2 pr-3">Funktion</th><th className="py-2 pr-3 text-right">Vorschläge</th><th className="py-2 pr-3 text-right">übernommen</th><th className="py-2 pr-3 text-right">geändert</th><th className="py-2 pr-3 text-right">verworfen</th><th className="py-2 pr-3 text-right">offen</th><th className="py-2 pr-3 text-right">Fehler</th><th className="py-2 pr-3 text-right">Ø Abweichung Mensch/KI</th></tr></thead>
            <tbody className="divide-y divide-neutral-200">
              {REGISTER.map((r) => {
                const s = byKind.get(r.kind);
                return (
                  <tr key={r.kind}>
                    <td className="py-2 pr-3">{r.name}</td>
                    {[s?.total, s?.accepted, s?.modified, s?.rejected, s?.open, s?.failed].map((v, i) => <td key={i} className="py-2 pr-3 text-right tabular-nums">{n(v)}</td>)}
                    <td className="py-2 pr-3 text-right tabular-nums">{r.kind === "scorecard_rating" && s?.mean_abs_deviation !== null && s?.mean_abs_deviation !== undefined ? `${String(s.mean_abs_deviation).replace(".", ",")} Stufen (${n(s.rating_pairs)} Paare)` : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Protokoll (neueste 30)</h2>
        {(recent ?? []).length === 0 ? <p className="text-muted">Noch keine KI-Aufrufe.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-muted"><tr><th className="py-2 pr-3">Zeit</th><th className="py-2 pr-3">Funktion</th><th className="py-2 pr-3">Kunde</th><th className="py-2 pr-3">Modell</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3 text-right">Dauer</th></tr></thead>
              <tbody className="divide-y divide-neutral-200">
                {(recent ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 tabular-nums">{fmt.format(new Date(r.created_at))}</td>
                    <td className="py-2 pr-3">{REGISTER.find((x) => x.kind === r.kind)?.name ?? r.kind}</td>
                    <td className="py-2 pr-3">{r.organizations?.name ?? "–"}</td>
                    <td className="py-2 pr-3"><code className="text-xs">{r.model}</code> <code className="text-xs text-muted">{r.prompt_version}</code></td>
                    <td className="py-2 pr-3">{STATUS[r.status] ?? r.status}{r.error && <span className="block text-xs text-red-800">{r.error}</span>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.latency_ms ? `${(r.latency_ms / 1000).toFixed(1).replace(".", ",")} s` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

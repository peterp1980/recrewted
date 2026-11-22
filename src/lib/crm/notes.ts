import { escapeHtml } from "./pipedrive";

// What a vacancy status change means on the deal. Counts and vacancy facts only, never candidate data.

export type VacancyFacts = { title: string; openings: number; applications: number; qualified: number; shortlisted: number; hired: number; url: string };

const LABEL: Record<string, string> = {
  draft: "Entwurf",
  contract_pending: "Vertrag versendet",
  active: "aktiv",
  paused: "pausiert",
  filled: "besetzt",
  closed: "geschlossen",
};

/** The deal is won when the vacancy goes live for the first time (contract signed). */
export function marksWon(from: string, to: string): boolean {
  return to === "active" && (from === "draft" || from === "contract_pending");
}

export function statusNote(from: string, to: string, v: VacancyFacts): string {
  const head: Record<string, string> = {
    contract_pending: "Vertrag versendet – wartet auf Unterschrift.",
    active: marksWon(from, to) ? "Vertrag unterschrieben – Vakanz ist aktiv, die Kampagne kann starten." : "Vakanz wieder aktiv.",
    paused: "Vakanz pausiert.",
    filled: `Stelle besetzt: ${v.hired} von ${v.openings} eingestellt.`,
    closed: "Vakanz ohne Besetzung geschlossen.",
    draft: "Vakanz zurück auf Entwurf.",
  };
  const funnel = to === "filled" || to === "closed" || to === "paused"
    ? `<p>Bewerbungen: ${v.applications} · qualifiziert: ${v.qualified} · Shortlist: ${v.shortlisted} · eingestellt: ${v.hired}</p>`
    : "";
  return `<p><b>recrewted · ${escapeHtml(v.title)}</b></p><p>${head[to] ?? `Status: ${LABEL[from] ?? from} → ${LABEL[to] ?? to}`}</p>${funnel}<p><a href="${escapeHtml(v.url)}">Vakanz in recrewted öffnen</a></p>`;
}

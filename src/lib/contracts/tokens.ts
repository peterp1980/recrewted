// Placeholders filled into PandaDoc templates. In the template they are written as [Kunde.Firma] etc.
// The list is what admins see in the app; keep it in sync with the templates.

export const KIND_LABEL: Record<string, string> = {
  offer: "Angebot",
  order_confirmation: "Auftragsbestätigung",
  framework: "Rahmenvertrag (AGB + AV-Vertrag)",
  terms: "AGB",
  dpa: "AV-Vertrag",
};

export const TOKEN_HELP: [string, string][] = [
  ["Kunde.Firma", "Name des Unternehmens"],
  ["Kunde.Website", "Website des Unternehmens"],
  ["Kunde.Ansprechpartner", "Name der Person, die unterschreibt"],
  ["Kunde.Email", "E-Mail der Person, die unterschreibt"],
  ["Stelle.Titel", "Titel der Vakanz (leer beim Rahmenvertrag)"],
  ["Stelle.Ort", "Arbeitsort oder „Remote“"],
  ["Stelle.Anzahl", "Zu besetzende Stellen"],
  ["Stelle.Start", "Gewünschter Start"],
  ["Paket", "Gewähltes Paket / Preismodell"],
  ["Preis", "Festpreis netto, z. B. „4.900,00 €“"],
  ["Werbebudget", "„im Preis enthalten“ oder Hinweis zum Aufschlag"],
  ["Dokument.Nummer", "Kurze Nummer, z. B. „RC-2026-1A2B3C“"],
  ["Dokument.Datum", "Datum der Erstellung"],
  ["projx.Unterzeichner", "Admin, der gegenzeichnet (falls gewählt)"],
];

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });

export type TokenInput = {
  company: string;
  website: string | null;
  recipientName: string;
  recipientEmail: string;
  vacancy: { title: string; location: string | null; remote: boolean; openings: number; startDate: string | null } | null;
  packageLabel: string | null;
  price: number | null;
  mediaMarkupPct: number | null;
  pricingModel: string | null;
  countersigner: string | null;
  contractId: string;
  now?: Date;
};

export function documentNumber(contractId: string, now = new Date()): string {
  return `RC-${now.getFullYear()}-${contractId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function buildTokens(i: TokenInput): Record<string, string> {
  const now = i.now ?? new Date();
  const media =
    i.pricingModel === "service_fee_media_passthrough"
      ? `wird separat abgerechnet${i.mediaMarkupPct ? `, zzgl. ${String(i.mediaMarkupPct).replace(".", ",")} % Aufschlag` : ""}`
      : i.pricingModel === "service_fee_customer_media"
        ? "läuft über Ihr eigenes Werbekonto"
        : "im Preis enthalten";
  return {
    "Kunde.Firma": i.company,
    "Kunde.Website": i.website ?? "",
    "Kunde.Ansprechpartner": i.recipientName,
    "Kunde.Email": i.recipientEmail,
    "Stelle.Titel": i.vacancy?.title ?? "",
    "Stelle.Ort": i.vacancy ? (i.vacancy.remote ? "Remote" : (i.vacancy.location ?? "")) : "",
    "Stelle.Anzahl": i.vacancy ? String(i.vacancy.openings) : "",
    "Stelle.Start": i.vacancy ? (i.vacancy.startDate ? date.format(new Date(i.vacancy.startDate)) : "ab sofort") : "",
    Paket: i.packageLabel ?? "",
    Preis: i.price === null ? "" : eur.format(i.price),
    Werbebudget: media,
    "Dokument.Nummer": documentNumber(i.contractId, now),
    "Dokument.Datum": date.format(now),
    "projx.Unterzeichner": i.countersigner ?? "",
  };
}

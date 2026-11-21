import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Datenschutz – recrewted", robots: { index: false } };

/**
 * DRAFT. The legal text must come from projx' data protection officer / lawyer
 * before go-live (CLAUDE.md: a human reviews security and privacy). The facts
 * below describe what the system actually does, as input for that text.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
      <p role="note" className="rounded-lg bg-amber-50 p-4 text-amber-900">Entwurf – dieser Text wird vor dem Livegang durch die geprüfte Datenschutzerklärung ersetzt.</p>
      <h1 className="text-2xl font-semibold">Datenschutz</h1>
      <h2 className="text-xl font-semibold">Was wir bei einer Bewerbung speichern</h2>
      <p>Vorname, Nachname, E-Mail-Adresse und/oder Telefonnummer, Ihre Antworten auf die Fragen zur Stelle, optional Ihren Lebenslauf, die Bewertung durch unser Recruiting-Team und die Rückmeldung des suchenden Unternehmens. Alles wird in Rechenzentren in Frankfurt am Main gespeichert.</p>
      <h2 className="text-xl font-semibold">Wie lange</h2>
      <p>Abgeschlossene Bewerbungen löschen wir sechs Monate nach Abschluss, Werbe-Klick-Kennungen nach 90 Tagen, anonyme Nutzungsereignisse nach 26 Monaten. Mit Talentpool-Einwilligung bleiben Ihre Kontaktdaten gespeichert, bis Sie widerrufen.</p>
      <h2 className="text-xl font-semibold">Cookies und Messung</h2>
      <p>Ohne Ihre Zustimmung setzen wir nur ein Cookie, das Ihre Auswahl speichert. Mit „Statistik“ zählen wir Seitenaufrufe ohne Bezug zu Ihrer Person. Mit „Marketing“ merken wir uns 90 Tage, über welche Anzeige Sie gekommen sind, und melden Bewerbung, Qualifizierung und Einstellung mit der Klick-Kennung (und, falls vorhanden, Ihrer E-Mail-Adresse in verschlüsselter Form als SHA-256-Hash) an diese Werbeplattform.</p>
      <h2 className="text-xl font-semibold">Ihre Rechte</h2>
      <p>Sie können jederzeit Auskunft verlangen und Ihre Daten löschen lassen: <Link href="/datenschutz/anfrage" className="underline">Auskunft oder Löschung anfordern</Link>.</p>
    </main>
  );
}

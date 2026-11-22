import type { Metadata } from "next";
import Link from "next/link";
import { Fill } from "@/components/LegalFill";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "Datenschutz – recrewted", robots: { index: false } };

/**
 * Privacy notice (Art. 13/14 GDPR). DRAFT written from what the system actually does (see docs/*.md).
 * Must be reviewed by projx' data protection officer / lawyer before go-live (CLAUDE.md).
 * Highlighted fields are open. Keep in sync when processing changes.
 */
export default function PrivacyPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Rechtliches" title="Datenschutz" lead="Welche Daten wir verarbeiten, wofür, wie lange – und welche Rechte Sie haben." />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2">
        <p role="note" className="rounded-lg bg-amber-50 p-4 text-amber-900">Entwurf – wird vor dem Livegang von unserem Datenschutzbeauftragten geprüft. Gelb markierte Angaben sind noch offen.</p>

        <section>
          <h2>1. Verantwortlicher und Datenschutzbeauftragter</h2>
          <p>projx GmbH, Landsberger Str. 72, 80339 München, vertreten durch <Fill>Geschäftsführung</Fill>. E-Mail: <Fill>datenschutz@…</Fill>.</p>
          <p>Datenschutzbeauftragter: <Fill>Name/Kanzlei, Kontakt</Fill>.</p>
          <p>Für Bewerbungen arbeiten wir im Auftrag des suchenden Unternehmens und geben Ihre Unterlagen an dieses weiter, wenn Sie in die engere Auswahl kommen. <Fill>Rolle mit DSB festlegen: eigene Verantwortung recrewted / gemeinsame Verantwortung / Auftragsverarbeitung für das Unternehmen</Fill>.</p>
        </section>

        <section>
          <h2>2. Besuch der Website</h2>
          <h3>Hosting und Server-Protokolle</h3>
          <p>Die Website läuft bei Vercel Inc. in einem Rechenzentrum in Frankfurt am Main; die Datenbank bei Supabase in Frankfurt (AWS eu-central-1). Beim Aufruf werden technisch notwendige Daten verarbeitet (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser), um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Vercel ist ein US-Unternehmen; die Übermittlung ist über <Fill>EU-US Data Privacy Framework / Standardvertragsklauseln</Fill> abgesichert.</p>
          <h3>Cookies und Messung</h3>
          <p>Ohne Ihre Zustimmung setzen wir nur ein Cookie, das Ihre Auswahl im Cookie-Hinweis speichert (§ 25 Abs. 2 TDDDG). Mit „Statistik“ zählen wir Seitenaufrufe auf unserem eigenen Server, ohne Profile über Sie zu bilden. Mit „Alle erlauben“ merken wir uns zusätzlich 90 Tage, über welche Anzeige Sie gekommen sind (z. B. Klick-Kennung von Meta, Google, TikTok, LinkedIn), und melden später, ob daraus eine Bewerbung, eine Vorauswahl oder eine Einstellung wurde – mit der Klick-Kennung und, falls vorhanden, Ihrer E-Mail-Adresse als SHA-256-Prüfsumme. Rechtsgrundlage: Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Sie können sie jederzeit über „Cookie-Einstellungen“ im Footer ändern.</p>
          <h3>Videos</h3>
          <p>Videos auf Karriereseiten laden erst nach Ihrem Klick von YouTube (youtube-nocookie.com). Erst dann werden Daten an Google übertragen.</p>
        </section>

        <section>
          <h2>3. Ihre Bewerbung</h2>
          <h3>Welche Daten</h3>
          <p>Vor- und Nachname, E-Mail-Adresse und/oder Telefonnummer, Ihre Antworten auf die Fragen zur Stelle, optional Ihr Lebenslauf, Ergebnisse eines Tests (falls die Stelle einen vorsieht), die Bewertung durch unser Recruiting-Team, Termine, die Rückmeldung des Unternehmens sowie die Herkunft Ihrer Bewerbung (z. B. Jobbörse, Karriereseite, Empfehlung).</p>
          <h3>Wofür und auf welcher Grundlage</h3>
          <p>Um Ihre Bewerbung zu prüfen, Sie dem Unternehmen vorzuschlagen und das Verfahren abzuwickeln: Art. 6 Abs. 1 lit. b DSGVO und § 26 BDSG <Fill>bzw. Ihre Einwilligung im Formular – mit DSB abstimmen</Fill>.</p>
          <h3>Ausschlussfragen</h3>
          <p>Manche Stellen haben zwingende Voraussetzungen (z. B. einen bestimmten Führerschein). Beantworten Sie eine solche Frage so, dass die Voraussetzung fehlt, sagen wir automatisch ab – zeitversetzt nach 24 Stunden. Die Fragen legt ein Mensch für die Stelle fest. Sie können verlangen, dass ein Mensch Ihre Bewerbung trotzdem ansieht, und Ihren Standpunkt darlegen: Schreiben Sie uns über das <Link href="/kontakt" className="underline">Kontaktformular</Link> (Art. 22 Abs. 3 DSGVO).</p>
          <h3>Künstliche Intelligenz in der Vorauswahl</h3>
          <p>Unser Recruiting-Team kann sich von einer KI unterstützen lassen: beim Formulieren von Anzeigen und – nur wenn das suchende Unternehmen zugestimmt hat – mit einem Vorschlag, wie Ihre Unterlagen zu den Anforderungen der Stelle passen. Jede Einschätzung muss mit einer Textstelle aus Ihren Unterlagen belegt sein; Name, Foto, Alter, Herkunft, Geschlecht, Religion, Gesundheit und ähnliche Merkmale werden nicht berücksichtigt. Die KI entscheidet nichts: Jede Bewertung trifft ein Mensch, und jeder Vorschlag wird mit Zeitpunkt, Modell und Entscheidung protokolliert. Die KI läuft in der EU (Amazon Bedrock, Frankfurt); Ihre Daten werden nicht zum Training verwendet. Sie können verlangen, dass Ihre Bewerbung ohne KI bearbeitet wird, und eine Erläuterung der Bewertung anfordern.</p>
          <h3>Tests</h3>
          <p>Bei Online-Tests speichern wir Ihre Antworten, hochgeladene Dateien und, als Hinweis für die Bewertung, die Zeitpunkte, zu denen das Testfenster verlassen oder Text eingefügt wurde – keine Inhalte aus anderen Fenstern und keine Bildschirmaufnahmen.</p>
          <h3>Wer Ihre Daten bekommt</h3>
          <ul>
            <li>Das suchende Unternehmen, sobald wir Sie vorschlagen (Shortlist). Hat es die anonyme Vorauswahl eingeschaltet, sieht es Name, Kontaktdaten und Lebenslauf erst, wenn es Sie kennenlernen möchte.</li>
            <li>Auf Wunsch des Unternehmens dessen Bewerbermanagement-System (z. B. Personio), wenn es Sie kennenlernen möchte.</li>
            <li>Unsere Dienstleister als Auftragsverarbeiter: Supabase (Datenbank und Dateien, Frankfurt), Vercel (Hosting, Frankfurt), Resend (E-Mail-Versand, <Fill>Region/Übermittlungsgrundlage</Fill>), Amazon Web Services (KI, Frankfurt – nur wenn eingeschaltet).</li>
            <li>WhatsApp (Meta) nur, wenn Sie Updates per WhatsApp angekreuzt haben – dann Ihre Handynummer und kurze Status-Nachrichten. Meta verarbeitet Daten auch in den USA <Fill>Übermittlungsgrundlage</Fill>.</li>
          </ul>
          <h3>Wie lange</h3>
          <ul>
            <li>Bewerbungen: bis sechs Monate nach Abschluss des Verfahrens, dann gelöscht (inklusive Lebenslauf, Tests und Termine).</li>
            <li>Talentpool (nur mit Einwilligung): bis Sie widerrufen, höchstens 24 Monate.</li>
            <li>Klick-Kennungen von Werbeanzeigen: 90 Tage. Zählungen ohne Personenbezug: 26 Monate. Versendete E-Mails: 90 Tage.</li>
          </ul>
        </section>

        <section>
          <h2>4. Freiwillige Zusatzfunktionen</h2>
          <ul>
            <li><strong>Talentpool und Job-Alerts:</strong> passende neue Stellen per E-Mail, höchstens einmal am Tag. Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), jederzeit im Bewerberprofil abschaltbar.</li>
            <li><strong>Bewerberprofil:</strong> ein persönlicher Link (30 Tage gültig), mit dem Sie Ihre Bewerbungen sehen, Daten ändern, eine Bewerbung zurückziehen oder nach einer Absage um eine kurze Begründung bitten.</li>
            <li><strong>WhatsApp:</strong> zusätzliche Status-Nachrichten. Einwilligung, Abmeldung mit „STOP“.</li>
            <li><strong>Terminbuchung:</strong> persönlicher Link zur Auswahl eines Gesprächstermins; Erinnerung am Vortag.</li>
            <li><strong>Kurze Umfrage nach der Entscheidung:</strong> eine Frage zum Ablauf, freiwillig. Unternehmen sehen nur Durchschnitte ab fünf Antworten. Rechtsgrundlage: berechtigtes Interesse an einem guten Verfahren (Art. 6 Abs. 1 lit. f DSGVO); Sie können widersprechen.</li>
            <li><strong>Empfehlungen von Mitarbeitern:</strong> Kommen Sie über den Link eines Mitarbeiters des Unternehmens, ordnen wir Ihre Bewerbung dieser Empfehlung zu; das Unternehmen sieht nur Zahlen je Link.</li>
          </ul>
        </section>

        <section>
          <h2>5. Kunden und Kontaktanfragen</h2>
          <p>Angaben aus dem Kontaktformular und von Nutzern unseres Kundenportals (Name, E-Mail, Unternehmen, Nachrichten, Kommentare) verarbeiten wir, um Anfragen zu beantworten und den Vertrag zu erfüllen (Art. 6 Abs. 1 lit. b und f DSGVO). Angebote und Verträge versenden wir über PandaDoc; Kundenbeziehungen pflegen wir in Pipedrive <Fill>Übermittlungsgrundlagen ergänzen</Fill>.</p>
        </section>

        <section>
          <h2>6. Ihre Rechte</h2>
          <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, eine Einwilligung jederzeit für die Zukunft zu widerrufen. Auskunft und Löschung können Sie direkt anfordern: <Link href="/datenschutz/anfrage" className="underline">Auskunft oder Löschung anfordern</Link>.</p>
          <p>Sie können sich bei einer Aufsichtsbehörde beschweren, zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.</p>
        </section>

        <p className="text-sm text-muted">Stand: <Fill>Datum</Fill></p>
      </div>
    </main>
  );
}

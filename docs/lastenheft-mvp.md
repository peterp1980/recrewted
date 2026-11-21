# Lastenheft MVP – recrewted

Stand: 20.11.2026 · Grundlage für Entwicklung und Aufwandsschätzung

Das MVP liefert den kompletten Weg von der Vakanz bis zur Einstellung für 2–3 Pilotkunden. recrewted steuert die Kampagnen selbst (Managed), der Kunde briefed, unterschreibt, bekommt eine Shortlist mit Bewertungsbogen und meldet die Einstellung zurück.

## 1. Rollen und Rechte

| Rolle | Wer | Darf |
| --- | --- | --- |
| `admin` | projx-Team | alles, inkl. Nutzer, Kunden, Vorlagen, Löschungen |
| `recruiter` | projx-Recruiting | Vakanzen, Kampagnen, Bewerbungen und Bewertungen aller Kunden bearbeiten; keine Nutzerverwaltung |
| `customer` | Nutzer beim Kunden | nur die eigene Organisation: Vakanzen anlegen (Briefing), Verträge sehen, Shortlist sehen, Feedback geben, Einstellung melden. Sieht Bewerber **nur**, wenn sie auf der Shortlist stehen. |
| Kandidat | ohne Login im MVP | Stellen ansehen, sich bewerben, Einwilligungen geben, Auskunft/Löschung per Link anfragen |

Umsetzung über Supabase Auth + Tabelle `profiles.role` + Row Level Security (siehe `supabase/migrations/0001_init.sql`).

## 2. Datenmodell (Überblick)

```
organizations (Kunde)
 ├─ customer_members ── profiles (Nutzer mit Rolle)
 ├─ contracts (PandaDoc-Dokumente)
 └─ vacancies (Vakanz, Pipedrive-Deal-ID, Status)
     ├─ vacancy_briefings (Suchprofil)
     ├─ screening_questions (Ausschlussfragen)
     ├─ scorecard_criteria (Kriterien des Bewertungsbogens)
     ├─ job_ads (Anzeigen-Varianten je Kanal)
     ├─ campaigns ── ad_accounts (Konto: recrewted oder Kunde)
     │    └─ ad_costs (tägliche Kosten)
     └─ applications ── candidates
          ├─ screening_answers
          ├─ scorecard_ratings (Bewertung je Kriterium)
          ├─ customer_feedback
          └─ application_attribution (Herkunft)
events (Tracking) · consents · audit_log · ai_recommendations
```

Status einer Bewerbung: `new → knockout_failed | screening → qualified | rejected → shortlisted → interview → hired | withdrawn`.

Status einer Vakanz: `draft → contract_pending → active → paused → filled | closed`.

## 3. Kernablauf

1. **Briefing:** Kunde (oder Recruiter für ihn) legt Vakanz an und füllt das Suchprofil.
2. **Vertrag:** System erzeugt das Angebot/den Auftrag in PandaDoc, Kunde unterschreibt per Link. Webhook setzt die Vakanz auf `active`.
3. **Aufbau:** Recruiter erstellt Ausschlussfragen, Bewertungskriterien und Anzeigen (Generator mit Vorlagen), legt Kampagnen an.
4. **Ausspielung:** Stelle geht auf die recrewted-Jobbörse, Google for Jobs und die angebundenen Portale; Kampagnen laufen über recrewted-Werbekonten.
5. **Bewerbung:** Kandidat bewirbt sich mobil in unter 2 Minuten, beantwortet Ausschlussfragen, lädt CV hoch (optional).
6. **Vorqualifizierung:** System prüft Ausschlussfragen automatisch; Recruiter bewertet nach Kriterien im Bewertungsbogen.
7. **Shortlist:** Recruiter gibt Kandidaten frei; Kunde sieht Shortlist mit Bewertungsbogen im Portal.
8. **Feedback:** Kunde bewertet per Klick (passt / passt nicht + Grund), meldet Interview und Einstellung.
9. **Abschluss:** Bei Einstellung geht die Stelle überall offline, Conversion wird gemeldet, KPIs werden aktualisiert.

## 4. Features und Akzeptanzkriterien

### Kandidaten

**F1 Jobbörse recrewted + Google for Jobs**
- Liste aktiver Stellen mit Filter (Ort, Umkreis, Berufsfeld, Anstellungsart) und Detailseite.
- Jede Detailseite enthält gültiges `JobPosting`-Schema inkl. Gehalt; besetzte Stellen werden aus Sitemap und Schema entfernt.
- Mobil zuerst: Lighthouse Performance ≥ 90 auf Mobilgeräten.

**F2 Kurzbewerbung mobil**
- Pflichtfelder: Vorname, Nachname, E-Mail oder Telefon, Antworten auf Ausschlussfragen. CV-Upload optional (PDF/DOCX/Bild, max. 10 MB).
- Kein Anschreiben, kein Account. Durchlauf in Tests unter 2 Minuten.
- Einwilligung zur Datenverarbeitung im Verfahren; Talentpool-Einwilligung separat und freiwillig.
- Eingangsbestätigung per E-Mail.

### Recruiting-Engine

**F3 Ausschlussfragen**
- Pro Vakanz definierbar (Ja/Nein, Auswahl, Zahl). Je Frage: welche Antwort ausschließt.
- Automatische Einordnung `knockout_failed` mit freundlicher Absage-Mail (Vorlage, zeitversetzt).

**F4 Bewertungsbogen**
- Kriterien je Vakanz mit Gewichtung (aus Vorlagen je Rolle übernehmbar).
- Recruiter bewertet je Kriterium 1–5 mit kurzer Begründung; Gesamtscore wird berechnet.
- Optional KI-Vorschlag je Kriterium; wird als Vorschlag markiert und muss bestätigt werden; Vorschlag landet in `ai_recommendations`.
- Kunde sieht Bewertungsbogen als übersichtliche Seite und als PDF-Export.

**F5 Pipeline + Mail-Vorlagen**
- Kanban je Vakanz nach Bewerbungsstatus, Drag-and-drop ändert Status und schreibt Event.
- Mail-Vorlagen (Eingang, Absage, Einladung, Rückfrage) mit Platzhaltern, Versand aus der Pipeline.

**F6 Rückmeldung Einstellung**
- Kunde kann pro Shortlist-Kandidat „Interview“, „eingestellt“, „abgelehnt + Grund“ setzen.
- „Eingestellt“ löst F11 und die Conversion-Meldung aus.

### Kampagnen

**F7 Managed-Kampagnen**
- Kampagne gehört zu Vakanz und Werbekonto (`ad_accounts.owner = recrewted | customer`); MVP nur `recrewted`.
- Kanal, Budget, Laufzeit, Ziel (qualifizierte Kandidaten) und Status erfassbar.
- Tracking-Links mit UTM werden automatisch erzeugt.

**F8 Job-Ad-Generator**
- Erzeugt aus dem Suchprofil Anzeigentexte je Kanal (Portal-Langtext, Social-Kurztext) mit mehreren Vorlagen.
- Prüft AGG-Formulierungen und Pflichtfelder (m/w/d, Gehalt, Ort) vor Freigabe.
- Recruiter bearbeitet und gibt frei; jede Version wird gespeichert.

**F9 Ausspielung an Portale**
- XML-Feed für Indeed und weitere Feed-Partner, Anbindung BA-Jobbörse, Google for Jobs über F1.
- StepStone und weitere Portale je nach Vertrag/Schnittstelle (Verträge sind Voraussetzung).
- Status je Portal sichtbar (online, Fehler, offline).

**F10 Gehaltsfeld**
- Gehaltsspanne ist Pflicht für die Veröffentlichung.

**F11 Stelle besetzt → überall offline**
- Bei `filled`/`closed` wird die Stelle innerhalb von 1 Stunde aus Jobbörse, Feeds, Schema und Kampagnen entfernt bzw. pausiert.

**F12 Herkunft bis zur Einstellung**
- Erfassung von UTM und Klick-IDs mit Consent, Festschreiben bei Bewerbung, Weitertragen bis `hired` (Details: `docs/tracking.md`).
- Server-Conversions für Lead, qualifiziert, eingestellt an Meta, Google, TikTok, LinkedIn (recrewted-Konten).

### Kunde

**F13 Briefing → Suchprofil**
- Geführtes Formular: Rolle, Aufgaben, Muss-/Kann-Kriterien, Gehalt, Ort, Start, Benefits, Ansprechpartner.
- Daraus entstehen Vorschläge für Ausschlussfragen und Bewertungskriterien.

**F14 Kundenportal: Shortlist + Feedback**
- Login per Magic Link. Übersicht der eigenen Vakanzen mit Funnel (Bewerbungen, qualifiziert, Shortlist) und Kosten pro qualifiziertem Kandidaten.
- Shortlist mit Bewertungsbogen, CV-Ansicht (nur Shortlist), Feedback per Klick.
- Download der signierten Verträge.

**F15 Pipedrive**
- Neue Pipeline „recrewted“. Vakanz speichert `pipedrive_deal_id`; Statuswechsel (Vertrag unterschrieben, aktiv, besetzt) werden als Aktivität/Stage am Deal gespiegelt.
- Deal-Wert ohne Mediabudget, außer das Angebot ist all-in.

**F16 PandaDoc**
- Vorlagen: Angebot, AGB, AV-Vertrag, Auftragsbestätigung mit Platzhaltern.
- Erzeugung per API, Versand per Link, Webhook bei Abschluss: signiertes PDF in Storage (`contracts`), Vakanz auf `active`.
- Vorlagenversion wird je Vertrag gespeichert.

### Plattform & Compliance

**F17 Rollen + Datenmodell** – wie Abschnitt 1–2, RLS-Tests für jede Rolle.

**F18 Betrieb** – Vercel `fra1`, Supabase Frankfurt, tägliche Backups, Fehler-Monitoring, eine Umgebung (prod); Entwicklung und Tests laufen lokal gegen Postgres (Entscheidung 21.11.2026, Kosten).

**F19 Protokoll** – `audit_log` für Lesezugriffe auf Bewerberdaten und alle Änderungen an Bewerbungen, Bewertungen, Verträgen.

**F20 Einwilligung + Löschfristen** – Consent-Banner, `consents`-Tabelle, automatische Löschung (Bewerbungen 6 Monate nach Abschluss, Klick-IDs 90 Tage, Events 26 Monate – Fristen mit DSB final abstimmen); Auskunft/Löschung auf Anfrage.

### Website

**F21 B2B-Seiten neu** – Startseite, Leistungen, Pakete, Cases (GULP, Randstad, Workerhero, XING Jobs – ohne Zahlen), Kontakt; saubere Meta-Daten; Redirects von `jobs.recrewted.de` und Altseiten.

## 5. Nicht im MVP

Self-Service und Hybrid, Kundenwerbekonten, CV-Parsing, Talentpool-Suche, Terminbuchung, Online-Assessment, WhatsApp, Deep Research der Kundenwebsite, Matching, Budget-Optimierung, Karriereseiten-Baukasten, Lizenz/Mandanten, API, Mehrsprachigkeit der Oberfläche (nur vorbereiten).

## 6. Nichtfunktionale Anforderungen

- DSGVO: alle Daten in der EU, AV-Verträge, Löschkonzept, Datenauskunft.
- Barrierefreiheit: WCAG 2.2 AA für Kandidatenseiten.
- Sicherheit: RLS auf jeder Tabelle, private Buckets, Penetrationstest vor Launch.
- Qualität: Unit- und E2E-Tests für die Kernabläufe 1–9.

## 7. Offen

- Preise und Garantie für den Pilot aus den Varianten im Preismodell-Sheet festlegen.
- Pilotkunden.
- Verträge/Schnittstellen mit Indeed, StepStone, BA.
- Design und Domain-Struktur (Jobbörse, Portal, Karriereseiten).
- Löschfristen und Rollen bei Kundenkonten mit dem Datenschutzbeauftragten.

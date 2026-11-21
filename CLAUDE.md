# recrewted – Projektkontext für Claude Code

recrewted ist die Recruiting-Lösung der projx GmbH (München): Online-Marketing plus HR-Software, die Kandidaten anzieht, vorqualifiziert und dem Kunden eine Shortlist mit Bewertungsbogen liefert – zum Festpreis. Dieses Repository ist der **Neubau** der Plattform (recrewted.de) inklusive des Systems dahinter.

## Kernversprechen und Kernprozess

**Vorqualifizierte Kandidaten zum Festpreis.**

Onboarding (Briefing, Vertrag per PandaDoc) → Job-Ads aus Vorlagen → Omnichannel-Kampagne → Bewerbung in 2 Minuten → Vorqualifizierung → **Bewertungsbogen + Shortlist** für den Kunden → Feedback → Einstellung.

Der Bewertungsbogen ist das sichtbare Produkt. Alles, was ihn besser, schneller oder nachvollziehbarer macht, hat Priorität.

## Getroffene Entscheidungen (nicht neu verhandeln)

| Thema | Entscheidung |
| --- | --- |
| Code-Basis | Neubau. Kein Code aus LuxJobs, kein Replit. |
| Daten | Keine Übernahme aus Sanity oder LuxJobs. |
| Hosting | Vercel (Funktionen in `fra1`) + Supabase (Region Frankfurt, `eu-central-1`). Alles in der EU. |
| Umgebungen | Nur **prod** (Kosten). Entwickeln und testen lokal gegen Postgres (`npm run test:db`); Migrationen erst lokal grün, dann auf prod. Keine Testdaten in prod. |
| Zukauf | Kein Zukauf von Fachfunktionen: Multiposting, CV-Parsing, Kalender, WhatsApp werden selbst gebaut. Infrastruktur (Vercel, Supabase) und PandaDoc sind gesetzt. |
| Verträge | PandaDoc für Angebot, AGB, AV-Vertrag, Auftragsbestätigung; signiertes PDF in die Kundenakte. |
| CRM | Neue Pipeline „recrewted“ in Pipedrive; Deal ↔ Vakanz verknüpft. |
| Kandidatenansprache | Beides: recrewted als eigene Marke (Jobbörse) **und** über Karriereseiten/Widgets der Kunden. |
| Branchen | Branchenoffen. Vorlagen je Branche/Rolle sind deshalb wichtig. |
| Werbekonten | Beides: Kampagnen über recrewted-Konten oder über Kundenkonten. Im MVP nur recrewted-Konten, Datenmodell kennt beides von Anfang an. |
| Bewerbermanagement | Eigenes, schlankes System **plus** spätere Übergabe an Personio & Co. |
| KPIs | Zeit bis Shortlist · Kosten pro qualifiziertem Kandidaten · Besetzungsquote · Kundenaufwand (Minuten pro Vakanz). |
| Vorgehen | Klein starten, im Pilot beweisen, dann skalieren. MVP = nur Managed-Kampagnen, 2–3 Pilotkunden. |

## Releases

- **MVP + Pilot:** siehe `docs/lastenheft-mvp.md` – das ist die verbindliche Grundlage.
- **Release 2 – Self-Service & Skalierung:** Self-Service/Hybrid-Kampagnen, Kundenkonten, CV-Parsing, Talentpool, Terminbuchung, Assessment, Deep Research der Kundenwebsite, Onboarding-Assistent, eingebettete Signatur.
- **Release 3 – Lizenz & Partner:** Matching, Budget-Optimierung, Mandanten für Personaldienstleister, API/Webhooks, Partnerprogramm, Karriereseiten-Baukasten.

Nichts aus Release 2/3 ins MVP ziehen, ohne dass Peter es freigibt.

## Technische Leitplanken

- **Stack (Vorschlag, beim Projektstart bestätigen):** Next.js (App Router, TypeScript) auf Vercel, Supabase (Postgres, Auth, Storage, Edge Functions), Tailwind. Tests mit Vitest/Playwright.
- **Datenbank:** Jede Tabelle hat Row Level Security. Schemaänderungen nur als Migration unter `supabase/migrations/`. Startschema: `0001_init.sql`.
- **Bewerberdaten:** Lebensläufe in einem privaten Storage-Bucket, nie öffentlich verlinkt. Tracking-Events enthalten nur IDs, keine personenbezogenen Inhalte.
- **Serverseitiges Tracking:** siehe `docs/tracking.md`. Browser liefert nur Einstieg + Consent, alles danach meldet der Server.
- **KI:** Die KI schlägt vor, ein Mensch entscheidet. Jede KI-Empfehlung (Score, Text) wird mit Eingabe, Modell und Zeitpunkt protokolliert. Recruiting-KI gilt im EU AI Act als Hochrisiko – Scores müssen erklärbar sein.
- **Anzeigen:** AGG-konform (m/w/d, keine diskriminierenden Formulierungen). Gehalt optional (Entscheidung Peter, 21.11.2026); wenn angegeben, erscheint es in Anzeige und `JobPosting`. Nach EU-Entgelttransparenz muss der Bewerber das Gehalt spätestens vor dem Vorstellungsgespräch erfahren.
- **Sprache:** Oberfläche und Texte auf Deutsch, Code und Kommentare auf Englisch. Mehrsprachigkeit vorbereiten (i18n-Schlüssel statt fest verdrahteter Strings).
- **Secrets:** nie ins Repo. `.env.local` lokal, Vercel/Supabase-Umgebungsvariablen für Deploys.

## Arbeitsweise

- Vor größeren Änderungen kurz den Plan nennen, dann umsetzen.
- Jedes Feature gegen die Akzeptanzkriterien im Lastenheft prüfen; Tests gehören zum Feature.
- Vor dem Livegang prüft ein Mensch bei projx Sicherheit und Datenschutz.
- Texte für Kunden und Kandidaten klingen wie von einem Menschen geschrieben – kein Werbe- oder KI-Sprech.

## Weitere Unterlagen (außerhalb des Repos)

- Planungs-Board (Whiteboard): https://claude.ai/artifact/HsHnH4ow5tSeJBepTTpxN4
- Preismodelle & Wirtschaftlichkeit (Sheet): https://claude.ai/artifact/NqF3PaYYqnQHmNdsfc2GQp
- Tracking-Konzept (Doc, ausführlich): https://claude.ai/artifact/28tpQ6PtZRGiVoDKLwE3Xh

Kontakt: Peter Petridis, peter@projx.de

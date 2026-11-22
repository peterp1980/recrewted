# Projektplan MVP – recrewted

Stand: 20.11.2026 · Vorschlag, von Peter freizugeben

## Stack (bestätigt durch das Grundgerüst)

| Teil | Wahl |
| --- | --- |
| App | Next.js 15 (App Router, TypeScript), Tailwind 4 |
| Daten/Auth/Storage | Supabase (Frankfurt), Zugriff über `@supabase/ssr`; Service-Role nur serverseitig |
| Hosting | Vercel, Funktionen in `fra1` (`vercel.json`) |
| Tests | Vitest (Unit + RLS gegen echtes Postgres), Playwright für E2E ab F2 |
| CI | GitHub Actions: Lint, Typecheck, Unit, RLS-Tests, Build |

## Ordnerstruktur

```
src/app/            Seiten (Route Groups je Bereich: (jobs), (portal), (admin), (site))
src/lib/supabase/   Clients: Browser, Server, Admin (Service-Role), Middleware
src/lib/            Fachlogik je Feature (z. B. scorecard/, tracking/, pandadoc/)
src/i18n/           Texte als Schlüssel (nur Deutsch im MVP)
supabase/migrations Schema, nur per Migration
supabase/tests/     RLS-Tests je Rolle
docs/               Lastenheft, Tracking, Preise, dieser Plan
```

## Reihenfolge und Aufwand

Schätzung für eine Entwicklerin/einen Entwickler mit Claude Code, in Arbeitstagen, grob (±30 %). Reihenfolge nach Abhängigkeiten und nach dem Bewertungsbogen als Kernprodukt.

**Meilenstein 1 – Pilot-fähig** (ein Pilotkunde kann vollständig betreut werden, Kampagnen werden noch manuell in den Werbekonten angelegt)

| # | Feature | Tage |
| --- | --- | --- |
| 0 | Grundgerüst, Migration, RLS-Tests, CI | erledigt |
| 1 | F18 Fehler-Monitoring, Backups (nur eine Umgebung: prod) | gebaut (Branch `mvp`), siehe docs/betrieb.md |
| 2 | F17 Login (Magic Link, nur Einladung), Nutzerverwaltung Admin | gebaut (Branch `mvp`), Test im Dashboard offen |
| 3 | F19 Protokoll (Änderungen per Trigger, Lesezugriffe in der App) | gebaut (Branch `mvp`) |
| 4 | F13 Briefing → Suchprofil | gebaut (Branch `mvp`) |
| 5 | F16 PandaDoc (Vorlagen, Versand, Webhook, PDF in Storage) | gebaut (Branch `mvp`); nur Admins; wartet auf API-Key, Webhook-Key und Vorlagen |
| 6 | F15 Pipedrive (Deal ↔ Vakanz, Stages spiegeln) | gebaut (Branch `mvp`); Pipeline „recrewted“ (12) besteht, sendet mit `PIPEDRIVE_API_TOKEN` |
| 7 | F1 Jobbörse + Google for Jobs, F10 Gehaltsfeld | gebaut (Branch `mvp`); PLZ-Import erledigt (22.11.2026, 23.296 Einträge GeoNames) |
| 8 | F2 Kurzbewerbung mobil + Eingangsmail | gebaut (Branch `mvp`); Mailversand wartet auf SMTP-Anbieter |
| 9 | F20 Consent-Banner, Einwilligungen, Löschjobs | gebaut (Branch `mvp`); Fristen mit DSB abstimmen |
| 10 | F3 Ausschlussfragen + zeitversetzte Absage | gebaut (Branch `mvp`) |
| 11 | F4 Bewertungsbogen inkl. PDF und KI-Vorschlag | gebaut (Branch `mvp`); KI-Vorschlag wartet auf Anbieter-Entscheidung |
| 12 | F5 Pipeline (Kanban) + Mail-Vorlagen | gebaut (Branch `mvp`) |
| 13 | F14 Kundenportal + F6 Rückmeldung Einstellung | gebaut (Branch `mvp`); Kundenaufwand-KPI mit F12 |
| 14 | F7 Managed-Kampagnen (Erfassung, UTM-Links) | gebaut (Branch `mvp`); Kosten manuell bis API-Anbindung |
| | **Summe M1** | **≈ 48** |

**Meilenstein 2 – MVP vollständig**

| # | Feature | Tage |
| --- | --- | --- |
| 15 | F12 Herkunft bis Einstellung + Server-Conversions (4 Plattformen) | gebaut (Branch `mvp`); Conversions senden erst mit Zugangsdaten |
| 16 | F8 Job-Ad-Generator mit AGG-Prüfung | gebaut (Branch `mvp`) |
| 17 | F9 Portale (Indeed-Feed, BA; StepStone je Vertrag) | Indeed-Feed + Status gebaut (Branch `mvp`); BA und StepStone warten auf Verträge |
| 18 | F11 Stelle besetzt → überall offline (≤ 1 h) | gebaut (Branch `mvp`); Pausieren auf den Werbeplattformen braucht API-Zugang |
| 19 | F21 B2B-Seiten + Redirects (abhängig vom Design) | gebaut (Branch `mvp`); Design, Case-Texte und alte URLs offen |
| 20 | Härtung: E2E-Tests Abläufe 1–9, WCAG 2.2 AA, Lighthouse ≥ 90, Pentest-Vorbereitung | 5 |
| | **Summe M2** | **≈ 29** |

Gesamt ≈ 77 Tage, mit Puffer rund 4–5 Monate bei einer Person. Der Pilot kann nach M1 starten; M2 läuft parallel zum Pilot. Das verschiebt nur die Reihenfolge, der Umfang des Lastenhefts bleibt gleich.

## Benötigte Zugänge (in der Reihenfolge, in der sie gebraucht werden)

1. GitHub-Repository `recrewted` (privat) mit Zugriff für Claude Code
2. Supabase-Organisation: Projekt in `eu-central-1` (kostenpflichtig ab Pro – vorher Freigabe)
3. Vercel-Team: Projekt mit Region `fra1`, verbunden mit dem Repo
4. Supabase Auth: öffentliche Registrierung aus, nur Einladungen
5. PandaDoc-API-Key und die vier Vorlagen (für #5)
6. Pipedrive-API-Token, Pipeline „recrewted“ mit Stages (für #6)
7. Mailversand (Absender-Domain, Anbieter in der EU) (für #8)
8. Werbekonten recrewted: Meta, Google Ads, TikTok, LinkedIn mit API-Zugang (für #15)
9. Indeed, StepStone, BA: Verträge/Schnittstellen (für #17)

## Offene Entscheidungen

- Mail-Anbieter (EU-Hosting, z. B. ein deutscher/europäischer Dienst) – bisher nicht festgelegt.
- KI-Modell und Anbieter für Bewertungsvorschläge (EU-Datenverarbeitung, AV-Vertrag).
- Design und Domain-Struktur (siehe Lastenheft, Abschnitt 7).

## Stand 21.11.2026 (Branch `mvp`)

Gebaut: alle Features. PandaDoc und Pipedrive senden, sobald die Schlüssel in Vercel stehen.
Migrationen 0001–0030 sind auf Prod eingespielt. Gehalt ist seit 0016 optional (Entscheidung Peter).

Assessment (Freigabe Peter, 21.11.2026, aus Release 2 vorgezogen): Tests je Vakanz direkt nach der Bewerbung oder per Link; Ja/Nein, Auswahl, Freitext, Case, Upload; Zeitlimit; Browser-Protokoll (Fenster verlassen, Kopieren, Einfügen – nur Zeitpunkt); automatische Punkte nur für geschlossene Fragen, offene bewertet ein Mensch. Vor dem Livegang mit dem DSB abstimmen (Protokollierung, Speicherdauer).

Zusätzlich (Freigabe Peter, 21.11.2026): Karriereseite je Kunde unter `/karriere/<kurzname>` und Stellen-Widget zum Einbetten (`/widget/<kurzname>`), gepflegt unter Admin → Unternehmen. Seit 21.11.2026 (Freigabe Peter) als Baukasten aus Abschnitten mit Live-Vorschau; Kunden bearbeiten im Portal, recrewted veröffentlicht. Damit ist der Karriereseiten-Baukasten aus Release 3 vorgezogen. Bewerbungen darüber zählen als Herkunft `career_page` bzw. `widget`.

Offen bis zum Livegang:

- Zugänge/Entscheidungen: PandaDoc, Pipedrive, SMTP-Anbieter, KI-Anbieter, Werbekonten-APIs, Verträge Indeed/StepStone/BA
- Supabase-Einstellungen (Site URL, Registrierung aus, Mail-Vorlagen) und Secrets in Vercel (siehe docs/betrieb.md)
- Texte: Datenschutzerklärung, Impressum, Case-Beschreibungen; Design; alte URLs für Weiterleitungen
- #20 Härtung: E2E-Tests der Abläufe 1–9 gegen eine Testdatenbank, WCAG-Prüfung mit echten Inhalten, Pentest

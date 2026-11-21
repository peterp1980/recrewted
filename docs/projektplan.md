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
| 1 | F18 Fehler-Monitoring, Backups (nur eine Umgebung: prod) | 1 |
| 2 | F17 Login (Magic Link, nur Einladung), Nutzerverwaltung Admin | gebaut (Branch `mvp`), Test im Dashboard offen |
| 3 | F19 Protokoll (Änderungen per Trigger, Lesezugriffe in der App) | gebaut (Branch `mvp`) |
| 4 | F13 Briefing → Suchprofil | 3 |
| 5 | F16 PandaDoc (Vorlagen, Versand, Webhook, PDF in Storage) | 4 |
| 6 | F15 Pipedrive (Deal ↔ Vakanz, Stages spiegeln) | 2 |
| 7 | F1 Jobbörse + Google for Jobs, F10 Gehaltsfeld | 4,5 |
| 8 | F2 Kurzbewerbung mobil + Eingangsmail | 4 |
| 9 | F20 Consent-Banner, Einwilligungen, Löschjobs | 4 |
| 10 | F3 Ausschlussfragen + zeitversetzte Absage | 2 |
| 11 | F4 Bewertungsbogen inkl. PDF und KI-Vorschlag | 5 |
| 12 | F5 Pipeline (Kanban) + Mail-Vorlagen | 5 |
| 13 | F14 Kundenportal + F6 Rückmeldung Einstellung | 6 |
| 14 | F7 Managed-Kampagnen (Erfassung, UTM-Links) | 3 |
| | **Summe M1** | **≈ 48** |

**Meilenstein 2 – MVP vollständig**

| # | Feature | Tage |
| --- | --- | --- |
| 15 | F12 Herkunft bis Einstellung + Server-Conversions (4 Plattformen) | 8 |
| 16 | F8 Job-Ad-Generator mit AGG-Prüfung | 5 |
| 17 | F9 Portale (Indeed-Feed, BA; StepStone je Vertrag) | 5 |
| 18 | F11 Stelle besetzt → überall offline (≤ 1 h) | 2 |
| 19 | F21 B2B-Seiten + Redirects (abhängig vom Design) | 4 |
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

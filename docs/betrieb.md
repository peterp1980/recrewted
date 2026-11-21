# Betrieb (F18)

## Umgebung

Nur **prod** (Entscheidung 21.11.2026). Supabase `recrewted-dev` (Ref `emiuwcczcuxfqodqseew`, Frankfurt) und Vercel-Projekt `recrewted` (Funktionen `fra1`). Entwicklung und Tests lokal (`npm run test:db`).

## Backups

- Supabase Pro erstellt **täglich** ein Backup und hält es 7 Tage vor (Dashboard → Database → Backups).
- Point-in-Time-Recovery (sekundengenaue Wiederherstellung) ist ein kostenpflichtiges Add-on – vor dem Pilot entscheiden.
- Dateien in Storage (Lebensläufe, Verträge) sind **nicht** Teil der Datenbank-Backups. Verträge liegen zusätzlich in PandaDoc; Lebensläufe werden nach Frist ohnehin gelöscht.
- Wiederherstellung: Dashboard → Database → Backups → Restore. Danach Migrationen prüfen (`supabase/migrations`) und `/api/health` aufrufen.

## Überwachung

- **Fehler:** Jeder Serverfehler wird als JSON-Zeile protokolliert (`src/instrumentation.ts`). Vercel → Projekt → Logs, Filter `level":"error"`. Fehlerseiten zeigen eine Kennung (`digest`), die im Log wiederzufinden ist.
- **Health-Check:** `GET /api/health` → 200, wenn die Datenbank erreichbar ist, sonst 503. Für einen Uptime-Dienst (EU) alle 5 Minuten abfragen.
- **Täglicher Lauf:** `/api/cron/daily` um 04:00 UTC (Löschfristen, Conversions, Mails). Ergebnis im Vercel-Log; die Löschung schreibt zusätzlich einen Eintrag ins `audit_log`.
- **Sicherheit:** Supabase → Advisors nach jeder Migration prüfen (Security muss leer sein).

## Umgebungsvariablen (Vercel)

| Variable | Wofür | Pflicht |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase-Anbindung | ja (gesetzt) |
| `SUPABASE_SERVICE_ROLE_KEY` | Bewerbungen, Jobbörse, Einladungen, Cron | ja |
| `CRON_SECRET` | schützt `/api/cron/*` | ja |
| `DATA_REQUEST_SECRET` | Links für Auskunft/Löschung | ja |
| `NEXT_PUBLIC_SITE_URL` | kanonische Adresse, z. B. `https://recrewted.de` | ab Domain |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_REPLY_TO` | Mailversand | sobald Anbieter feststeht |
| `META_*`, `TIKTOK_*`, `LINKEDIN_*`, `GOOGLE_ADS_*` | Conversions (F12) | sobald Konten angebunden |
| `VERCEL_API_TOKEN` (geheim), `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | eigene Domains der Karriereseiten automatisch im Hosting anlegen und Status anzeigen | optional; ohne sie Domains von Hand in Vercel anlegen |
| `VERCEL_DOMAIN_BRANCH` | Kunden-Domains an einen Branch binden (z. B. `mvp`), solange Produktion noch nicht auf `main` läuft | übergangsweise |

Geheime Werte als „Sensitive“ anlegen. Rotieren: neuen Wert setzen, neu deployen; bei `DATA_REQUEST_SECRET` werden offene Links ungültig, bei `CRON_SECRET` nichts weiter.

## Vor dem Livegang

- Sicherheits- und Datenschutzprüfung durch projx (CLAUDE.md), Penetrationstest (Lastenheft 6)
- Datenschutzerklärung und Impressum durch geprüfte Texte ersetzen (Seiten sind als Entwurf markiert)
- Löschfristen mit dem DSB festlegen (`public.run_retention`-Parameter)
- Supabase Auth: Registrierung aus, Site URL, Mail-Vorlagen (`supabase/templates/README.md`)

## Eigene Domains für Karriereseiten

1. Admin → Unternehmen → Einstellungen: Domain eintragen (z. B. `karriere.kunde.de`).
2. Der Kunde legt beim Domain-Anbieter den angezeigten Eintrag an: Subdomain `CNAME → cname.vercel-dns.com`, Hauptdomain `A → 76.76.21.21`.
3. Ist `VERCEL_API_TOKEN` gesetzt, wird die Domain beim Speichern im Vercel-Projekt angelegt und der Status angezeigt. Sonst die Domain in Vercel (Projekt → Domains) von Hand hinzufügen.
4. Unter der Domain zeigt `/` die Karriereseite; Stellen, Bewerbung und Tests laufen unter derselben Domain. Admin, Portal und Login leiten auf recrewted um.

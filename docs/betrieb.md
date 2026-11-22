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
| `RESEND_API_KEY` (geheim), `MAIL_FROM`, `MAIL_REPLY_TO` | Mailversand über Resend (bevorzugt) | ja |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Mailversand über SMTP (Alternative, nur ohne `RESEND_API_KEY`) | nein |
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


## Mailversand mit Resend

1. Resend-Konto anlegen, unter **Domains** eine Absender-Domain hinzufügen, z. B. `mail.recrewted.de` (Subdomain, damit die
   normale Firmen-Mail unberührt bleibt). Als Region **Europa (eu-west-1, Irland)** wählen.
2. Die angezeigten DNS-Einträge (SPF/MX und DKIM) beim DNS-Anbieter eintragen, warten bis „Verified“.
   Empfohlen zusätzlich DMARC: `_dmarc.mail.recrewted.de` TXT `v=DMARC1; p=none; rua=mailto:<postfach>`.
3. Unter **API Keys** einen Schlüssel mit „Sending access“ nur für diese Domain anlegen.
4. In Vercel (Projekt `recrewted` → Settings → Environment Variables, für Production und Preview):
   - `RESEND_API_KEY` = der Schlüssel (als „Sensitive“ markieren)
   - `MAIL_FROM` = `recrewted <bewerbung@mail.recrewted.de>`
   - `MAIL_REPLY_TO` = ein Postfach, das gelesen wird (Antworten von Bewerbern landen dort)
   Danach neu deployen. Wartende Mails gehen beim nächsten Durchlauf raus (spätestens im täglichen Cron).
5. **Login-Mails von Supabase** (Magic Link, Einladungen) laufen getrennt: Supabase → Authentication → Emails → SMTP Settings:
   Host `smtp.resend.com`, Port `465`, Benutzer `resend`, Passwort = ein (eigener) Resend-API-Key, Absender wie oben.
6. Datenschutz: AV-Vertrag (DPA) mit Resend abschließen; Resend ist ein US-Unternehmen – Übermittlungsgrundlage
   (Data Privacy Framework / Standardvertragsklauseln) ins Verarbeitungsverzeichnis.

### Stand 22.11.2026

- Resend-Domain `mail.recrewted.de` angelegt (Region eu-west-1, Tracking aus), ID `780158e1-3b8f-43ae-ae49-4b34a1efb21a`.
- `MAIL_FROM` in Vercel gesetzt (Production + Preview). Offen: DNS-Einträge bei GoDaddy, `RESEND_API_KEY` in Vercel.
- DNS-Einträge für die Zone `recrewted.de` (DNS liegt bei GoDaddy, Nameserver domaincontrol.com):

| Typ | Name (Host) | Wert | Priorität |
| --- | --- | --- | --- |
| TXT | `resend._domainkey.mail` | DKIM-Schlüssel aus Resend (Domains › mail.recrewted.de) | – |
| MX | `send.mail` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | – |
| CNAME | `rsend.mail` | `send.forge.rmta.net` | – |
| TXT | `_dmarc.mail` (empfohlen) | `v=DMARC1; p=none;` | – |

## VERCEL_API_TOKEN (eigene Domains für Karriereseiten)

1. vercel.com → Avatar oben rechts → **Account Settings** → **Tokens** → **Create Token**.
2. Name z. B. `recrewted-domains`, **Scope: das Team**, in dem das Projekt liegt, Ablaufdatum nach eurer Richtlinie
   (z. B. 1 Jahr, im Kalender vormerken).
3. Den Token einmalig kopieren und im Projekt `recrewted` → Settings → Environment Variables als `VERCEL_API_TOKEN`
   (Sensitive, Production und Preview) eintragen. `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` und `VERCEL_DOMAIN_BRANCH` sind schon gesetzt.
4. Neu deployen. Ab dann legt „Speichern“ bei einer Kunden-Domain diese automatisch im Projekt an und zeigt den DNS-Status.
Der Token hat die Rechte des Kontos, das ihn erstellt – nie ins Repo oder in Chats kopieren.

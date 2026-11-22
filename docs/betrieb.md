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
5. **Impressum des Kunden (0028):** Im selben Formular Impressumstext und/oder Link zum Impressum des Kunden eintragen. Die Domain gilt als geprüft, sobald `https://<domain>/api/domain-check` von unserem Server signiert beantwortet wird (DNS, Zertifikat und Weiterleitung in einem). Geprüft wird beim Öffnen der Unternehmensseite im Admin und täglich im Cron; das Ergebnis steht in `career_domain_verified_at`. Nur dann zeigt `/impressum` auf der Kundendomain das Impressum des Kunden, mit Hinweis auf den technischen Betrieb durch die projx GmbH. Auf recrewted.de und bei ungeprüfter Domain bleibt das Impressum der projx GmbH. Ändert sich die Domain, wird die Prüfung zurückgesetzt.

## Kostenlose Jobkanäle (F9)

- Admin → Kanäle: je Kanal ein Schalter für alle Kunden, dazu Feed-Adresse, Anmeldelink und Bewerbungen der letzten 90 Tage. Admin → Unternehmen → „Kanäle“: Ausnahmen je Kunde.
- Raus: Google for Jobs (strukturierte Daten auf der Stellenseite) und XML-Feeds unter `/feeds/<kanal>.xml` (Indeed, Jooble, Talent.com, Adzuna, Careerjet, Jobrapido, kimeta im Indeed-Format, LinkedIn im eigenen Format). Ausgeschaltete Kanäle liefern einen leeren Feed.
- Rein: Bewerber klicken auf unsere Stellenseite und bewerben sich dort; jeder Feed-Link trägt `utm_source=<kanal>`, die Bewerbung ist dem Kanal zugeordnet (F12).
- Jeder Feed muss einmal beim Portal angemeldet werden (Links auf der Kanäle-Seite). LinkedIn listet nur nach Freischaltung als Feed-Partner. BA-Jobbörse ist kostenlos, braucht aber eine Anmeldung als Kooperationspartner (HR-BA-XML über SFTP mit Zertifikat).
- Seit 0031 hängt nichts mehr am Gehalt: Stellen ohne Gehaltsangabe gehen ebenfalls raus (Gehalt optional, 21.11.2026).

## Stellen importieren (0032)

- **Kunden-Stellen:** Admin → Unternehmen → „Stellen des Kunden importieren“. Quellen: Personio (öffentlicher XML-Feed), Greenhouse, Lever, SmartRecruiters, Recruitee, Workable (öffentliche Schnittstellen, ohne Schlüssel) und Karriereseiten mit Google-for-Jobs-Daten (`JobPosting`). Nur im Auftrag des Kunden.
- Neue Stellen werden **Entwürfe** mit vorausgefülltem Briefing (Überschriften wie „Ihre Aufgaben“, „Profil“, „Wir bieten“ werden zugeordnet, der Rest steht in den Notizen). Ein Recruiter prüft und gibt frei; aktive Vakanzen ändert ein Import nie. Verschwindet eine Stelle beim Kunden, steht sie als „nicht mehr gelistet“ in der Liste.
- Abruf beim Anlegen, auf Knopfdruck und täglich im Cron. Höchstens 50 neue Entwürfe je Lauf.
- **Partner-Stellen (Adzuna, Jooble):** unter den eigenen Treffern in der Jobbörse, klar als extern markiert, mit Quellenangabe, Links mit `nofollow sponsored`, nicht in Google for Jobs, Feeds, Sitemap oder llms.txt. Serverseitige Abfrage nur mit Suchbegriff und Ort (keine Besucherdaten), eine Stunde zwischengespeichert. Vercel-Variablen: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (kostenloses Entwicklerkonto auf developer.adzuna.com), `JOOBLE_API_KEY` (kostenloser Partner-Schlüssel von Jooble). Nutzungsbedingungen beider Anbieter vor dem Einschalten lesen (Quellenangabe ist Pflicht).
- **Schalter:** Admin → Kanäle → „Rein: Stellen importieren“. Kunden-Import ist an, Partner-Stellen sind aus.
- **Nicht gebaut, bewusst:** Übernahme aus der BA-Jobbörse (ohne Zustimmung der BA rechtlich unsicher) und Scraping von Portalen oder fremden Karriereseiten (Nutzungsbedingungen, Datenbankrecht).

## Angebote und Verträge mit PandaDoc (F16)

- Nur Admins der projx GmbH erstellen, senden und verwalten Angebote und Verträge (RLS ab 0030). Recruiter sehen sie, Kunden sehen ihre unterschriebenen PDFs im Portal.
- Einrichtung: in Vercel `PANDADOC_API_KEY` und `PANDADOC_WEBHOOK_KEY` (beide „Sensitive“). In PandaDoc einen Webhook auf `https://<site>/api/pandadoc/webhook` mit dem Ereignis „Document state changed“ anlegen. Vorlagen unter Admin → Verträge hinterlegen (je Dokumentart eine aktive, mit Rolle „Kunde“, optional „projx“ für die Gegenzeichnung). Platzhalter-Liste steht auf derselben Seite.
- Ablauf: Admin → Unternehmen (Rahmenvertrag, AGB, AV-Vertrag) oder Admin → Vakanz (Angebot, Auftragsbestätigung) → „Erstellen und senden“. PandaDoc schickt dem Kunden die Mail zum Unterschreiben. Beim Senden geht die Vakanz auf „Vertrag versendet“.
- Nach der Unterschrift (Webhook): PDF in den privaten Bucket `contracts`, Vakanz wird aktiv, Pipedrive-Deal wird gewonnen. Ohne Webhook: „Status abrufen“ im Admin.

## Pipedrive (F15)

- Vercel-Variablen: `PIPEDRIVE_API_TOKEN` (geheim, trägt Peter selbst ein: Pipedrive → Persönliche Einstellungen → API → Token kopieren; Vercel → Projekt → Settings → Environment Variables, Typ „Sensitive“, Production und Preview), `PIPEDRIVE_PIPELINE_ID=12` (Pipeline „recrewted“), `PIPEDRIVE_STAGE_ID=81` („Qualifiziert“), optional `PIPEDRIVE_COMPANY_DOMAIN` für Deal-Links.
- Admin → Vakanz → „Pipedrive“: bestehenden Deal verknüpfen (Nummer oder Link) oder neuen Deal anlegen (Firma wird gesucht oder angelegt, Wert = Festpreis der Vakanz).
- Statuswechsel einer verknüpften Vakanz landen als Notiz am Deal; die erste Aktivierung (Vertrag unterschrieben) markiert den Deal als gewonnen. Notizen enthalten nur Zahlen (Bewerbungen, qualifiziert, Shortlist, eingestellt), keine Bewerberdaten.
- Jede Anfrage über das Kontaktformular wird ein Lead (Person per E-Mail gefunden oder angelegt, Firma, Nachricht als Notiz).
- Alles läuft über die Warteschlange `crm_outbox` (0029): sofort nach der Änderung, Wiederholung im täglichen Cron, höchstens 5 Versuche. Ohne Token wartet die Warteschlange, nichts geht verloren.

## SEO und GEO

- Jede öffentliche Seite hat Titel, Beschreibung, Canonical, Open Graph und Twitter-Card (`src/lib/seo.ts`).
- Vorschaubilder: `src/app/opengraph-image.tsx` (Website) und je Stelle `jobs/[slug]/opengraph-image.tsx` (Titel, Arbeitgeber, Ort, Gehalt).
- Strukturierte Daten: `Organization` (recrewted, betrieben von der projx GmbH), `WebSite` mit Suche, `FAQPage` auf der Startseite; `JobPosting` und `BreadcrumbList` je Stelle.
- `/llms.txt`: Kurzfassung für KI-Suche (ChatGPT, Perplexity, Claude, Gemini) mit Leistungen, FAQ und allen aktiven Stellen; alle 15 Minuten neu.
- `robots.txt` erlaubt Suchmaschinen und KI-Crawler ausdrücklich, sperrt persönliche Links (Termin, Umfrage, Profil, Tests), Admin, Portal und Widgets.
- Nach dem Umzug auf recrewted.de: Domain in der Google Search Console und den Bing Webmaster Tools anmelden und die Sitemap einreichen.


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

# Tracking – Kurzfassung für die Entwicklung

Ausführliche Fassung mit Architekturbild: https://claude.ai/artifact/28tpQ6PtZRGiVoDKLwE3Xh

## Grundsätze

- Bis zur Einstellung messen. Der Browser liefert nur Einstieg (UTM, Klick-IDs) und Consent, alles danach meldet der Server.
- Alles in der EU: Vercel-Funktionen `fra1`, Supabase Frankfurt.
- Jede Kampagne kennt ihr Werbekonto (`recrewted` oder `customer`); Conversions gehen an das Konto, das ausgespielt hat.
- Einstieg wird getrennt erfasst: `jobboard` (recrewted), `career_page` (Kunde), `widget` (Kunde).

## Events (Tabelle `events`)

| Event | Quelle | An Plattformen |
| --- | --- | --- |
| `page_view` | Browser | nein |
| `job_view` | Browser | ja (ViewContent) |
| `apply_start` | Browser | nein |
| `apply_submit` | Server | ja (Lead) |
| `knockout_passed` | Server | nein |
| `qualified` | Server | ja (Haupt-Conversion) |
| `shortlisted` | Server | nein |
| `customer_feedback` | Server | nein |
| `interview_booked` | Server | optional |
| `hired` | Server | ja (Offline-Conversion) |
| `probation_passed` | Server | nein |
| `withdrawn_or_rejected` | Server | nein |

Jedes Event trägt: `organization_id`, `vacancy_id`, `campaign_id`, `ad_account_owner`, `channel`, `entry_point`, `application_id` (wo vorhanden). Keine personenbezogenen Inhalte.

## Attribution

1. Einstieg: UTM + `gclid`/`wbraid`/`fbclid`/`ttclid`/`li_fat_id` mit Marketing-Consent als First-Party-Cookie (90 Tage).
2. Bei `apply_submit` in `application_attribution` festschreiben.
3. Regel: letzter bezahlter Klick, sonst letzter organischer Kanal.
4. Alle Folge-Events erben die Herkunft der Bewerbung.

## Conversions

Meta Conversions API, Google Ads (Enhanced Conversions + Offline-Import per Klick-ID), TikTok Events API, LinkedIn Conversions API. Übertragen werden nur Klick-ID, Zeitpunkt, Event-Name, Event-ID (Deduplizierung) und mit Einwilligung gehashte E-Mail/Telefon (SHA-256).

## Consent

| Stufe | ohne | Statistik | Marketing |
| --- | --- | --- | --- |
| Bewerbung/Funnel im Backend | ja | ja | ja |
| Seitenaufrufe | nein | ja | ja |
| Klick-IDs speichern | nein | nein | ja |
| Conversions an Plattformen | nein | nein | ja |

## KPIs

- Zeit bis Shortlist = Tage Kampagnenstart → erstes `shortlisted`
- Kosten pro qualifiziertem Kandidaten = (Media + Fixpreisanteil) ÷ `qualified`
- Besetzungsquote = Vakanzen mit `hired` ÷ abgeschlossene Vakanzen
- Kundenaufwand = aktive Minuten im Kundenportal pro Vakanz

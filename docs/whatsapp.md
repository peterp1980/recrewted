# WhatsApp

Kandidaten können bei der Bewerbung freiwillig „Updates per WhatsApp“ ankreuzen (nur mit Handynummer; eigene
Einwilligung, Text im Formular, Consent-Version `2026-11-21c`). Dann geht jede der folgenden Mails **zusätzlich**
als WhatsApp-Nachricht raus. Die E-Mail geht immer – sie ist der Fallback, solange WhatsApp nicht eingerichtet ist,
eine Vorlage fehlt oder die Nummer nicht bei WhatsApp ist.

Technik: Ein DB-Trigger spiegelt Kandidaten-Mails in `whatsapp_outbox` (Migration 0024). Gesendet wird direkt über die
WhatsApp Business Platform (Cloud API) von Meta – kein Zwischenanbieter. Wird eine Mail storniert (z. B. Status
korrigiert), wird die WhatsApp-Nachricht mit storniert. „STOP“, „Stopp“ oder „abmelden“ als Antwort widerruft die
Einwilligung sofort.

## Einrichtung (einmalig, durch projx)

1. Meta Business Manager: WhatsApp-Business-Konto anlegen, Telefonnummer verifizieren, Unternehmen verifizieren.
2. System-User mit Berechtigung für das WhatsApp-Konto anlegen und einen dauerhaften Token erzeugen.
3. Die Vorlagen unten in WhatsApp Manager › Nachrichtenvorlagen anlegen (Kategorie **Utility**, Sprache **Deutsch (de)**)
   und freigeben lassen. Namen exakt so übernehmen.
4. Webhook in der Meta-App: Callback-URL `https://<domain>/api/whatsapp/webhook`, Felder `messages` abonnieren.
5. Vercel-Umgebungsvariablen setzen (nie ins Repo):
   - `WHATSAPP_TOKEN` – Token des System-Users
   - `WHATSAPP_PHONE_NUMBER_ID` – ID der Absendernummer
   - `WHATSAPP_APP_SECRET` – App-Geheimnis (prüft die Signatur jedes Webhook-Aufrufs)
   - `WHATSAPP_VERIFY_TOKEN` – frei gewählter Wert für den Webhook-Handshake
   - optional `WHATSAPP_API_VERSION` (Standard `v21.0`; bei Meta auf die aktuelle Version prüfen)

Ohne `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` wird nichts gesendet; die Nachrichten bleiben in der Warteschlange
und Mails laufen normal.

## Vorlagen zum Einreichen

Platzhalter `{{1}}`, `{{2}}` … werden in dieser Reihenfolge gefüllt. Für Kunden mit „du“ gibt es jeweils `_du`.

| Name | Text (Sie) | Text (du, Name mit `_du`) |
| --- | --- | --- |
| `recrewted_status_update` | Hallo {{1}}, kurzes Update zu Ihrer Bewerbung als {{2}}: Ihre Bewerbung {{3}}. Mehr dazu in Ihrer E-Mail. | Hallo {{1}}, kurzes Update zu deiner Bewerbung als {{2}}: Deine Bewerbung {{3}}. Mehr dazu in deiner E-Mail. |
| `recrewted_assessment_invite` | Hallo {{1}}, für Ihre Bewerbung als {{2}} gibt es einen kurzen Test. Hier geht's los: {{3}} | Hallo {{1}}, für deine Bewerbung als {{2}} gibt es einen kurzen Test. Hier geht's los: {{3}} |
| `recrewted_booking_invite` | Hallo {{1}}, das Unternehmen möchte Sie für die Stelle {{2}} kennenlernen. Wählen Sie hier Ihren Termin: {{3}} | Hallo {{1}}, das Unternehmen möchte dich für die Stelle {{2}} kennenlernen. Wähl hier deinen Termin: {{3}} |
| `recrewted_interview_booked` | Hallo {{1}}, Ihr Termin für {{2}} steht: {{3}}, {{4}}. Details und Kalendereintrag per E-Mail. | Hallo {{1}}, dein Termin für {{2}} steht: {{3}}, {{4}}. Details und Kalendereintrag per E-Mail. |
| `recrewted_interview_cancelled` | Hallo {{1}}, Ihr Termin für {{2}} am {{3}} muss leider ausfallen. Einen neuen Termin wählen Sie über den Link in Ihrer E-Mail. | Hallo {{1}}, dein Termin für {{2}} am {{3}} muss leider ausfallen. Einen neuen Termin wählst du über den Link in deiner E-Mail. |
| `recrewted_interview_reminder` | Hallo {{1}}, zur Erinnerung: Ihr Termin ist {{2}}, {{3}}. Bis dann! | Hallo {{1}}, zur Erinnerung: Dein Termin ist {{2}}, {{3}}. Bis dann! |

Fußzeile für alle Vorlagen: „Antworten Sie STOP, um keine WhatsApp-Nachrichten mehr zu erhalten.“ (du: „Antworte STOP …“).

## Datenschutz (für den DSB)

- Eigene, freiwillige Einwilligung; ohne sie keine WhatsApp-Nachricht. Widerruf per „STOP“ oder über uns.
- Meta verarbeitet Telefonnummer und Nachrichteninhalt; Drittlandübermittlung (USA) prüfen, AV-Vertrag mit Meta
  (WhatsApp Business Terms) und Hinweis in der Datenschutzerklärung nötig.
- Inhalte sind kurz und ohne Bewertungen; Details bleiben in der E-Mail bzw. hinter dem persönlichen Link.
- Antworten der Kandidaten landen in `whatsapp_inbound` (nur recrewted sieht sie) und werden mit dem Kandidaten gelöscht.
- Die Datenauskunft (`candidate_export`) enthält gesendete Nachrichten und Antworten.

# Übergabe an Bewerbermanagement-Systeme (ATS)

Kunden schalten die Übergabe selbst ein (Portal › Integrationen) oder recrewted macht es für sie (Admin › Unternehmen).
Pro Kunde gibt es eine Verbindung: System, API-Key, Auslöser, Stellen-Zuordnung.

## Ablauf

1. Kunde wählt das System, trägt Zugangsdaten und API-Key ein, schaltet ein.
2. „Verbindung testen“ macht einen lesenden Aufruf und liest – wo möglich – die offenen Stellen für die Zuordnung.
3. Jede Vakanz bekommt die Stellen-ID aus dem ATS (`vacancies.ats_job_id`).
4. Auslöser (pro Kunde): Shortlist, „Kennenlernen“ (Status `interview`/`hired`, Standard) oder nur manuell.
   Ein DB-Trigger (`private.queue_ats_transfer`) legt dann einen Eintrag in `ats_transfers` an – egal ob der
   Status vom Recruiter oder über das Kundenfeedback kommt. Ein Kandidat wird pro Verbindung höchstens einmal übertragen.
5. Übertragen wird direkt nach der Statusänderung (`after()`), Reste und Wiederholungen im täglichen Cron.
   Temporäre Fehler (429, 5xx, Netzwerk) bis zu fünf Versuche; 4xx (falscher Key, unbekannte Stelle) sofort „fehlgeschlagen“
   mit Fehlertext an Bewerbung und Verbindung. Button „Erneut versuchen“ an der Bewerbung.

Übertragen werden: Vor- und Nachname, E-Mail, Telefon, Stelle, Quelle „recrewted“, Lebenslauf (falls vorhanden und vom
System unterstützt) und ein Link zum Bewertungsbogen im Portal. Keine Screening-Antworten, keine Scores.

## Systeme

| System | Weg | Zugang beim Kunden | Lebenslauf |
| --- | --- | --- | --- |
| Personio | Recruiting API v1 `POST /v1/recruiting/applications` (+ `/documents`), `X-Company-ID` | Recruiting-Integration-Token + Company-ID | ja (Upload, max. 20 MB) |
| Recruitee | `POST /c/{company}/candidates` mit `offers` | Personal API Token | per kurzlebigem Link (`remote_cv_url`) |
| SmartRecruiters | `POST /jobs/{id}/candidates`, `X-SmartToken` | API-Key aus Credential Manager | nein (2-MB-Grenze; Link im Hinweistext) |
| Lever | `POST /v1/opportunities?perform_as=` (multipart), Basic Auth | API-Key + User-ID | ja |
| BambooHR | `POST {sub}.bamboohr.com/api/v1/applicant_tracking/application`, Basic Auth | API-Key mit Hiring-Rechten | ja |
| Webhook | signiertes JSON an beliebige https-URL | frei gewählter Schlüssel (≥ 16 Zeichen) | Link, 1 Stunde gültig |

Für softgarden (Apply-API nur für Partner), rexx (keine öffentliche API), d.vinci, JOIN und Greenhouse (Harvest v3, OAuth)
ist der Webhook der Weg – z. B. über Zapier, Make oder n8n. Direkte Adapter bauen wir, sobald ein Pilotkunde sie braucht.

**Wichtig:** Die Endpunkte und Feldnamen stammen aus den öffentlichen Hersteller-Dokus (Stand November 2026), wurden aber
noch nicht gegen ein echtes Kundenkonto getestet. Die erste Übergabe je System begleitet ein Mensch und prüft das Ergebnis
im ATS. Personio v1 soll laut Personio durch v2 ersetzt werden; v2 hat noch keinen Schreib-Endpunkt.

### Webhook-Signatur

Header `X-Recrewted-Timestamp` (Unix-Sekunden) und `X-Recrewted-Signature: sha256=<hex>` mit
`HMAC-SHA256(schlüssel, "<timestamp>.<body>")`. Empfänger sollten Zeitstempel älter als 5 Minuten verwerfen.
Ereignisse: `test`, `candidate.handover`. Ziel-URLs nur https, keine IP-Adressen und keine internen Hostnamen.

## Sicherheit

- API-Keys werden in der App mit AES-256-GCM verschlüsselt (`src/lib/ats/crypto.ts`); der Schlüssel ist aus
  `DATA_REQUEST_SECRET` abgeleitet (eigenes Label). Wird `DATA_REQUEST_SECRET` getauscht, müssen die Kunden ihre Keys neu eintragen.
- Angemeldete Nutzer können `secret_enc` nicht lesen (Spaltenrechte) und die Tabelle nicht direkt ändern; geschrieben wird
  nur über Server-Aktionen nach Prüfung von Staff-Rolle oder Mitgliedschaft. Angezeigt werden nur die letzten vier Zeichen.
- Speichern, Entfernen und Key-Wechsel landen im Audit-Log (ohne Key).
- Datenschutz: Die Übergabe erfolgt im Auftrag des Kunden an sein eigenes System; im AV-Vertrag als Weitergabe an den
  Verantwortlichen beschreiben. Vor dem Livegang durch den DSB prüfen lassen.

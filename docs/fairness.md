# Faire Vorauswahl, Entgelttransparenz, Kunden-Erinnerung, Bewerber-Umfrage, Barrierefreiheit (Migration 0026)

## Anonyme Vorauswahl (Blind Review)
- Schalter je Kunde (Admin › Unternehmen › Faire Vorauswahl; Inhaber im Portal unter Team).
- Durchgesetzt in der Datenbank: Die Leserechte des Kunden auf `candidates` gelten erst ab Status `interview`/`hired`
  (`private.customer_can_see_identity`). Bis dahin zeigt das Portal „Kandidat:in A, B, …“ (Reihenfolge der Shortlist),
  ohne Kontaktdaten und Lebenslauf; Bewertungsbogen, Begründungen und Testergebnisse bleiben sichtbar.
- Mails mit Erwähnungen nennen den Namen nicht; die ATS-Übergabe wartet bis „Gespräch vereinbart“.
- Hinweis: Der Lebenslauf bleibt verborgen, weil er Name und Foto enthält. Eine geschwärzte Fassung kommt mit dem CV-Parsing.

## Entgelttransparenz (Richtlinie (EU) 2023/970, Art. 5)
- Bewerber müssen das Gehalt bzw. die Spanne spätestens vor dem Vorstellungsgespräch erfahren.
- Vakanz › Einstellungen › „Gehaltsinfo für Bewerber“ (Freitext), sonst die Spanne aus dem Briefing.
- „Termin buchen lassen“ ist ohne Gehaltsangabe gesperrt; Einladung und Terminbestätigung enthalten die Zeile „Gehalt: …“.
- Die Umsetzung ins deutsche Recht (Entgelttransparenzgesetz neu) vor dem Livegang mit dem Anwalt abgleichen.

## Erinnerung an Kunden-Feedback
- Täglicher Cron an Werktagen: Shortlist-Kandidaten ohne Rückmeldung seit mehr als 3 Tagen → eine Mail je Person und Vakanz
  (Zuständige, sonst Inhaber/Mitarbeiter), höchstens alle 3 Tage, mit Link zum Vergleich.

## Bewerber-Umfrage (Candidate Experience)
- Nach „eingestellt“ oder „abgesagt“ (nicht nach automatischen Ausschlüssen) einmal eine Mail, zwei Tage später, mit
  persönlichem signiertem Link (`/umfrage/<token>`, 30 Tage). Eine Frage (1–5) plus freiwilliger Kommentar.
- Kunden sehen nur Durchschnitte ab fünf Antworten (Auswertung); Kommentare nur recrewted. Löschung mit der Bewerbung.
- Rechtsgrundlage: berechtigtes Interesse an der Verbesserung des Verfahrens, freiwillige Teilnahme – vom DSB bestätigen lassen;
  ggf. Widerspruchshinweis in der Mail ergänzen.

## Barrierefreiheit
- Erklärung unter `/barrierefreiheit` (Entwurf, BFSG / WCAG 2.1 AA) mit Feedback-Weg; Datum der letzten Prüfung ergänzen.

# Terminbuchung

- Recruiter oder Kunde (Inhaber/Mitarbeiter) legen auf der Vakanzseite freie Termine an: einzeln oder als Serie
  hintereinander, mit Dauer, Art (vor Ort, Video, Telefon), Ort oder Video-Link und optionalem Hinweis.
- An der Bewerbung: „Termin buchen lassen“ schickt dem Kandidaten seinen persönlichen Link (`/termin/<token>`,
  signiert, 30 Tage gültig, kein Login). Ohne Mail-Anbieter wird der Link angezeigt, um ihn selbst zu schicken.
- Der Kandidat wählt einen freien Termin (frühestens 2 Stunden voraus). `book_slot` bucht atomar: ein Termin kann nur
  einmal vergeben werden, eine Bewerbung hat höchstens einen aktiven Termin. Status wird „Gespräch“.
- Bestätigung per Mail mit Link (Kalenderdatei .ics, Umbuchen, Absagen); das Team (Zuständige der Vakanz bzw.
  Inhaber/Mitarbeiter sowie wer eingeladen hat) bekommt eine Mail. Erinnerung am Vortag (täglicher Cron, 12–36 h vorher).
- Umbuchen und Absagen durch den Kandidaten bis 24 Stunden vorher. Das Team kann jederzeit absagen oder einen Termin
  streichen; der Kandidat wird informiert und kann neu wählen.
- Kandidaten mit WhatsApp-Einwilligung bekommen Einladung, Bestätigung, Absage und Erinnerung zusätzlich per WhatsApp.

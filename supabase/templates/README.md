# E-Mail-Vorlagen für Supabase Auth

Diese Vorlagen werden im Supabase-Dashboard eingetragen (Authentication → Emails), nicht automatisch eingespielt.

| Datei | Vorlage im Dashboard | Betreff |
| --- | --- | --- |
| `magic-link.html` | Magic Link | Ihr Anmeldelink für recrewted |
| `invite.html` | Invite user | Ihr Zugang zu recrewted |

Die Links zeigen auf `/auth/confirm` mit `token_hash`. Dadurch funktionieren sie auch, wenn die Mail auf einem anderen Gerät geöffnet wird als dem, auf dem der Link angefordert wurde.

Voraussetzungen in Supabase:

- Authentication → URL Configuration → **Site URL** = Adresse der App (aktuell `https://recrewted-chi.vercel.app`, später `https://recrewted.de`)
- Authentication → Sign In / Providers → **Allow new users to sign up** = aus (nur Einladungen)
- Für den Pilot eigenen SMTP-Versand einrichten: Der eingebaute Versand von Supabase schickt nur wenige Mails pro Stunde.

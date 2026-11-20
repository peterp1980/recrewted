# recrewted

Neubau der Recruiting-Plattform recrewted.de – vorqualifizierte Kandidaten zum Festpreis.

## Inhalt

| Pfad | Was |
| --- | --- |
| `CLAUDE.md` | Projektkontext und Entscheidungen – Claude Code liest das automatisch |
| `docs/lastenheft-mvp.md` | Verbindlicher Umfang des MVP mit Akzeptanzkriterien |
| `docs/tracking.md` | Tracking- und Attributionskonzept (Kurzfassung) |
| `docs/preise.md` | Preismodelle, die das System abbilden muss |
| `supabase/migrations/0001_init.sql` | Startschema mit Row Level Security (lokal getestet) |

## Start in Claude Code

1. Neues privates GitHub-Repository `recrewted` anlegen und diesen Ordner hineinpushen:
   ```bash
   git init -b main && git add -A && git commit -m "Start"
   git remote add origin git@github.com:<org>/recrewted.git
   git push -u origin main
   ```
2. Ordner in Claude Code öffnen (`claude` im Terminal im Projektordner).
3. Ersten Prompt verwenden:

> Lies CLAUDE.md und docs/lastenheft-mvp.md. Schlag mir zuerst einen Projektplan für das MVP vor: Ordnerstruktur, Stack-Bestätigung, Reihenfolge der Features mit grober Aufwandsschätzung in Tagen und welche Zugänge du von mir brauchst. Danach richte das Projekt ein: Next.js mit TypeScript, Supabase-Anbindung, die Migration 0001_init.sql, Tests für die Zugriffsregeln und ein erstes Deployment auf Vercel in fra1. Frag nach, bevor du kostenpflichtige Ressourcen anlegst.

## Zugänge, die gebraucht werden

- Supabase-Organisation (Projekt in Frankfurt anlegen)
- Vercel-Team (Funktionen-Region `fra1`)
- PandaDoc-API-Key und Vorlagen
- Pipedrive-API-Token und neue Pipeline „recrewted“
- Werbekonten recrewted: Meta Business Manager, Google Ads, TikTok Ads, LinkedIn Campaign Manager
- Verträge/Schnittstellen: Indeed, StepStone, BA-Jobbörse

## Hinweis

Keine Kandidatendaten aus LuxJobs übernehmen. Die alten Lebensläufe im LuxJobs-Ordner gehören gelöscht.

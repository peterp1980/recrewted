# recrewted

Neubau der Recruiting-Plattform recrewted.de – vorqualifizierte Kandidaten zum Festpreis.

## Inhalt

| Pfad | Was |
| --- | --- |
| `CLAUDE.md` | Projektkontext und Entscheidungen – Claude Code liest das automatisch |
| `docs/lastenheft-mvp.md` | Verbindlicher Umfang des MVP mit Akzeptanzkriterien |
| `docs/tracking.md` | Tracking- und Attributionskonzept (Kurzfassung) |
| `docs/preise.md` | Preismodelle, die das System abbilden muss |
| `docs/projektplan.md` | Reihenfolge, Aufwand, benötigte Zugänge |
| `supabase/migrations/0001_init.sql` | Startschema mit Row Level Security |
| `supabase/tests/` | Tests der Zugriffsregeln je Rolle (gegen echtes Postgres) |
| `src/` | Next.js-App (App Router, TypeScript, Tailwind) |

## Entwicklung

Voraussetzungen: Node 22, ein lokales Postgres 16 (oder Docker) für die Datenbanktests.

```bash
npm ci
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Prüfungen (laufen auch in GitHub Actions bei jedem Push):

```bash
npm run lint && npm run typecheck && npm test && npm run test:db && npm run build
```

`npm run test:db` legt eine frische Datenbank an, spielt einen Supabase-Ersatz (`supabase/tests/supabase-stub.sql`) und alle Migrationen ein und prüft die Rechte von Admin, Recruiter, Kunde und anonymen Besuchern. Verbindung über `TEST_DATABASE_URL`. Postgres per Docker:

```bash
docker run -d --name recrewted-pg -e POSTGRES_HOST_AUTH_METHOD=trust -p 54329:5432 postgres:16
```

## Umgebung

Es gibt nur **prod** (Entscheidung 21.11.2026, Kosten):

| | |
| --- | --- |
| Supabase | Projekt `recrewted-dev` (Ref `emiuwcczcuxfqodqseew`, Frankfurt) – trotz des Namens die Produktivdatenbank |
| Vercel | Projekt `recrewted`, Region `fra1`, https://recrewted-chi.vercel.app |

Entwickelt und getestet wird lokal (`npm run test:db` gegen Postgres). Migrationen gehen erst auf Supabase, wenn sie lokal grün sind. Vorschau-Deployments von Branches nutzen dieselbe Datenbank – dort keine Testdaten anlegen.

`SUPABASE_SERVICE_ROLE_KEY` wird erst mit den ersten Server-Schreibzugriffen gebraucht und direkt in Vercel hinterlegt (nie im Repo).

## Einstellungen in Supabase (beim Anlegen des Projekts)

- Region `eu-central-1` (Frankfurt)
- Auth → öffentliche Registrierung **aus**; Kunden und Team werden eingeladen. Neue Nutzer bekommen automatisch die Rolle `customer`, Team-Rollen vergibt ein Admin.
- Migrationen aus `supabase/migrations/` einspielen

## Zugänge, die gebraucht werden

- Supabase-Organisation (Projekt in Frankfurt anlegen)
- Vercel-Team (Funktionen-Region `fra1`)
- PandaDoc-API-Key und Vorlagen
- Pipedrive-API-Token und neue Pipeline „recrewted“
- Werbekonten recrewted: Meta Business Manager, Google Ads, TikTok Ads, LinkedIn Campaign Manager
- Verträge/Schnittstellen: Indeed, StepStone, BA-Jobbörse

## Hinweis

Keine Kandidatendaten aus LuxJobs übernehmen. Die alten Lebensläufe im LuxJobs-Ordner gehören gelöscht.

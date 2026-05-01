@AGENTS.md

## Project context

Catz is a cat show finder that combines FIFe and TICA show calendars into one
UI with map, calendar, and list views. See README.md for full architecture,
data model, roadmap, and deployment notes.

## Key conventions

- Data layer uses SQLite via `better-sqlite3` (in `src/lib/db.ts`). Schema is
  auto-migrated on first connection. Will be swapped to Postgres for deployment.
- Scrapers are in `src/lib/scrapers/` and return `NormalisedShow[]`.
  Always upsert by `(source, source_id)`.
- External API calls (Nominatim, OSRM) are rate-limited in-process and
  results cached in the DB. Respect these limits.
- UI is all client components (`"use client"`) since the page fetches data
  via `/api/shows`. Filter state is local React state.
- Home address is persisted in `localStorage` (key: `catz.home`).
- FIFe = blue, TICA = rose — consistent across badges, calendar cells, and
  map markers.

## What's done (MVP)

All core features work end-to-end: scraping, geocoding, routing, filtered API,
list/calendar/map views with org badges, home address + distance.

## What's next

See "Roadmap / future features" in README.md. Next priority:
1. Deploy (swap SQLite → Postgres)
2. Judge scraping + filtering
3. AI free-text filtering

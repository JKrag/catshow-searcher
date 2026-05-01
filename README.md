# catz

A unified calendar + map for **FIFe** and **TICA** cat shows. Built so exhibitors
(and curious visitors) can find shows in one place, filter by org / country /
date / search, and see driving distance from their home address.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind v4**
- **better-sqlite3** for local data + caches (swap to Postgres for prod)
- **MapLibre GL** + OpenStreetMap raster tiles
- **Nominatim** for geocoding (cached in `geocode_cache`)
- **OSRM** demo server for driving distance/time (cached in `route_cache`)

## Local development

```bash
npm install
npm run dev
# http://localhost:3000
```

The SQLite database lives at `.data/catz.sqlite` (gitignored). It is created
automatically on first request.

### Seed it with shows

Visit [`/admin`](http://localhost:3000/admin) and click **Refresh now** — that
runs both scrapers and geocodes a batch of new shows. (No token is required in
dev. Set `CATZ_ADMIN_TOKEN` in production to require a `Bearer` header.)

You can also POST directly:

```bash
curl -X POST http://localhost:3000/api/admin/refresh
```

## Project layout

```
src/
  app/
    page.tsx                    main UI: filters + tabs (list/calendar/map)
    admin/page.tsx              refresh button + scrape-run history
    api/
      shows/route.ts            GET /api/shows  — filtered shows
      admin/refresh/route.ts    POST /api/admin/refresh — scrape + geocode
      geocode/route.ts          GET /api/geocode?q=…
      route/route.ts            POST /api/route — driving distances
  components/
    FilterSidebar.tsx           org, country, date, search, distance filters
    HomeAddressInput.tsx        geocoded once, persisted to localStorage
    OrgBadge.tsx                FIFe (blue) / TICA (rose) pill + marker color
    ShowCalendar.tsx            month grid view
    ShowList.tsx                sortable list with distance column
    ShowMap.tsx                 MapLibre map with org-coloured markers
    home.ts                     useHome() hook + localStorage helpers
  lib/
    db.ts                       SQLite connection + schema
    types.ts                    Show, NormalisedShow, ShowFilter, …
    shows-repo.ts               upsert + filtered query (incl. radius)
    scrape-runs.ts              start/finish/list run records
    geocode.ts                  Nominatim client w/ rate limit + cache
    route.ts                    OSRM client w/ cache
    scrapers/
      fife.ts                   iCal parser → NormalisedShow[]
      tica.ts                   HTML parser (Joomla TOES) → NormalisedShow[]
      run.ts                    runs both, geocodes a budgeted batch
```

## Data sources

- **FIFe** — `https://fifeweb.org/events/list/?tribe_eventcategory[0]=8&ical=1`
  (Tribe Events iCal feed; clean structured data)
- **TICA** — `https://shows.tica.org/en/component/toes/shows`
  (Joomla TOES component; HTML scraped)

Each show is upserted by `(source, source_id)`. Re-running the refresh is safe.

## Notes / known limitations

- **Nominatim** is rate-limited (1 req/s) and may return `429` during a refresh
  with many new shows. Negative lookups are cached; just refresh again later
  to pick up the rest.
- **OSRM** demo server is also rate-limited and not suitable for production.
  Swap `CATZ_OSRM_BASE` to a self-hosted instance or another routing provider
  before going live.
- SQLite is fine locally but **does not work on Vercel serverless**. For
  deployment, replace `src/lib/db.ts` with a Postgres-backed implementation
  (Vercel Postgres / Neon) — the schema in `migrate()` is portable.

## Future features (not in MVP)

- Per-show judge lists + judge-based filtering
- AI free-text filtering ("northern Europe before May 1st with judge X or Y")
- User accounts + saved searches + notifications

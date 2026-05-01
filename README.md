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

## Architecture

```
[FIFe site] ─┐
             ├─► scraper (manual + future cron) ─► normalize ─► shows table (SQLite)
[TICA site] ─┘                                                       │
                                                                     ▼
                                          Next.js API routes ◄── geocode/route caches
                                                  │
                                                  ▼
                              React UI: Calendar | Map | List, with filter sidebar
```

### Data model

- `shows` — id, source ('FIFe'|'TICA'), source_id, title, club, country,
  city, venue, start_date, end_date, lat, lng, url, raw_json, scraped_at.
  Unique on `(source, source_id)` for idempotent upsert.
- `geocode_cache` — query (text pk), lat, lng, display_name, fetched_at.
- `route_cache` — origin_lat, origin_lng, dest_lat, dest_lng (composite pk),
  distance_m, duration_s, fetched_at.
- `scrape_runs` — id, source, started_at, finished_at, status, items_seen,
  items_changed, error.

### Scraper details

- **FIFe**: fetches an iCal feed from Tribe Events on fifeweb.org. Parsed with
  a custom iCal parser in `src/lib/scrapers/fife.ts`. Clean structured data.
- **TICA**: HTML-scrapes `shows.tica.org` (Joomla TOES component). Parsed with
  `node-html-parser` in `src/lib/scrapers/tica.ts`. Structure:
  `.month-heading` → `.show-entry` with `.date`, `.address`, `.club-name`.
  Show ID comes from `a[rel]` attribute.
- Both scrapers return `NormalisedShow[]` which is upserted via
  `shows-repo.ts`. Re-running is always safe.

### External services & rate limits

| Service   | Purpose        | Rate limit     | Cached? | Env var override  |
|-----------|----------------|----------------|---------|-------------------|
| Nominatim | Geocoding      | 1 req/s        | Yes     | —                 |
| OSRM demo | Driving routes | Rate-limited   | Yes     | `CATZ_OSRM_BASE`  |
| OSM tiles | Map tiles      | Usage policy   | Browser | —                 |

### Environment variables

| Variable           | Required | Description                              |
|--------------------|----------|------------------------------------------|
| `CATZ_DB_PATH`     | No       | SQLite path (default: `.data/catz.sqlite`)|
| `CATZ_ADMIN_TOKEN` | No       | Bearer token for `/api/admin/refresh`     |
| `CATZ_OSRM_BASE`   | No       | OSRM base URL                            |
| `CATZ_USER_AGENT`  | No       | User-Agent for external API calls         |

## Deployment (TODO — blocked)

The MVP uses SQLite (`better-sqlite3`) which does not run on Vercel's serverless
runtime. To deploy:

1. **Swap `src/lib/db.ts`** to use Vercel Postgres or Neon. The SQL schema in
   `migrate()` is standard SQL and mostly portable — only `datetime('now')`
   needs changing to `now()`.
2. **Provision a database** (Vercel Postgres, Neon, or Supabase).
3. **Set env vars** in Vercel project settings.
4. **Configure a cron** (Vercel Cron or GitHub Action) to POST
   `/api/admin/refresh` daily with a Bearer token.
5. **Swap OSRM** to a self-hosted instance or paid service
   (OpenRouteService, Google Distance Matrix) for production traffic.

## Roadmap / future features

### Phase 2: Show details & judge filtering
- Scrape per-show detail pages to extract the list of judges for each show.
  - FIFe: individual event pages on fifeweb.org.
  - TICA: detail loaded via AJAX at `shows.tica.org` with show ID.
- Add a `show_judges` table (show_id, judge_name, role).
- Add judge filter in the sidebar (multi-select, searches across all shows).
- Use case: "I know judges X and Y like my cat — show me shows where either
  one is judging."

### Phase 3: AI-powered free-text filtering
- Add an LLM-backed natural language filter endpoint.
- User types e.g. "Show all TICA shows in northern Europe before May 1st
  where either Judge A or Judge B are judging" and the LLM translates that
  to structured `ShowFilter` + judge filter params.
- Cache LLM responses per query to keep costs down.
- Requires judge data from Phase 2 to be meaningful.

### Phase 4: User accounts & personalisation
- Auth (email magic link or OAuth).
- Saved filters / search presets.
- "Watch list" — mark shows as interested, get email/push notifications
  when details change (dates, judges, venue).
- Personal calendar export (iCal feed of watched shows).

### Other ideas
- **Clustering on map** — MapLibre marker clustering for regions with many shows.
- **Show detail drawer** — click a show in list/calendar to see full details
  in a slide-over panel instead of navigating away.
- **Country normalisation** — TICA data has duplicated country names in
  different languages (e.g. "Sverige" and "Sweden", "日本" and "Japan").
  Build a normalisation map to merge them.
- **Mobile responsive** — the current layout works but could benefit from
  a bottom-sheet filter UX on small screens.
- **Vercel KV** — hot cache layer for frequently-accessed show queries.
- **Scheduled geocoding** — a background job that geocodes remaining shows
  (currently limited to a batch of 25 per refresh to respect Nominatim).

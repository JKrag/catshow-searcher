# catz

A unified calendar + map for **FIFe** and **TICA** cat shows. Built so exhibitors
(and curious visitors) can find shows in one place, filter by org / country /
date / search, and see driving distance from their home address.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind v4**
- **@vercel/blob** — single JSON blob (`catz-data.json`) as the data store;
  local fallback at `.data/catz.json`
- **MapLibre GL** + OpenStreetMap raster tiles
- **Nominatim** for geocoding (cached in the store's `geocode_cache`)
- **OSRM** demo server for driving distance/time (cached per-request)

No database, no Docker, no Postgres.

## Local development

### 1. Install

```bash
npm install
```

### 2. Seed data

Run the full scrape pipeline (calendar + detail pages + geocoding). On a cold
store this takes 10–20 minutes because external services are rate-limited to
~1 req/s. For a quick smoke run, pass small budgets instead:

```bash
# Full run (writes .data/catz.json)
npm run scrape:all

# Quick smoke run — finishes in ~30 s
npm run scrape:all -- --geocode-budget 5 --detail-budget 3
```

### 3. Start the app

```bash
npm run dev
# http://localhost:3000
```

The app reads `.data/catz.json` when `BLOB_READ_WRITE_TOKEN` is not set.

### Environment variables (optional for local dev)

Copy the example file and edit as needed:

```bash
cp .env.local.example .env.local
```

| Variable               | Required | Description                                              |
|------------------------|----------|----------------------------------------------------------|
| `BLOB_READ_WRITE_TOKEN`| No       | Vercel Blob token — if set, reads/writes the cloud blob  |
| `CATZ_ADMIN_TOKEN`     | No       | Bearer token protecting the admin status API in prod     |
| `CATZ_OSRM_BASE`       | No       | OSRM base URL (default: `router.project-osrm.org`)       |
| `CATZ_USER_AGENT`      | No       | User-Agent string for external API calls                 |

## Production data flow

A **daily GitHub Actions cron** (`.github/workflows/scrape.yml`, 03:23 UTC)
runs `npm run scrape:all`, which:

1. Fetches the FIFe iCal feed (paginated, up to 3 years ahead)
2. Scrapes the TICA show calendar (paginated across seasons)
3. Fetches per-show detail pages for show type, club website, and flyer links
4. Geocodes new addresses via Nominatim (rate-limited 1 req/s)
5. Writes the result back to the Vercel blob using `BLOB_READ_WRITE_TOKEN`

The Next.js app is **read-only** against the blob — it never runs scrapers
itself. See [ADR 0001](docs/adr/0001-scrape-in-github-actions.md) for why.

The blob is seeded from the repo secret `BLOB_READ_WRITE_TOKEN`. There is no
database provisioning step.

## Persona routes

| Route         | Persona    | Default view | Sidebar                                 |
|---------------|------------|--------------|-----------------------------------------|
| `/`           | Visitor    | Map          | Date, country, distance only            |
| `/exhibitor`  | Exhibitor  | List         | All filters: org, country, date, search, distance |
| `/organizer`  | Organizer  | —            | Stub placeholder ("Timeline view coming soon") |

`PersonaNav` (in `layout.tsx`) highlights the active route on each page.

## Admin page

`/admin` is a **read-only status dashboard** showing:

- Blob `updated_at` age
- Show counts per org
- Detail-fetch and geocode coverage
- Scrape-run history
- Link to the GitHub Actions runs page

The `/api/debug` route that powers it is protected by `CATZ_ADMIN_TOKEN` in
production (no token required in dev). There is no "Refresh now" button — scraping
is the Actions job's responsibility.

## Testing

```bash
npm test            # Vitest, one-shot (use in CI and before commits)
npm run test:watch  # Watch mode for TDD
```

Tests live in `src/**/__tests__/` and cover the pure-function core:
`parseICal`, `parseFifeDetail`, `parseTica`, `parseTicaDetail`,
`normalizeCountry`, and `upsertShows`.

To smoke-test a scraper against the live endpoint without starting the app:

```bash
npm run scrape:fife   # Prints count + date range
npm run scrape:tica   # Prints count + date range
```

## Project layout

```
src/
  app/
    page.tsx                  Visitor route (/)
    layout.tsx                Shared layout + PersonaNav
    globals.css               Tailwind v4 global styles
    exhibitor/page.tsx        Exhibitor route
    organizer/page.tsx        Organizer stub
    admin/page.tsx            Read-only status dashboard
    api/
      shows/route.ts          GET /api/shows — filtered show list
      geocode/route.ts        GET /api/geocode?q=… — address lookup
      route/route.ts          POST /api/route — driving distances
      debug/route.ts          GET /api/debug — admin status data
  components/
    FilterSidebar.tsx         Org, country, date, search, distance filters
    HomeAddressInput.tsx      Geocoded once, persisted to localStorage
    OrgBadge.tsx              FIFe (blue) / TICA (rose) pill + marker colour
    PersonaNav.tsx            Route switcher shown in the layout header
    ShowCalendar.tsx          Month grid view
    ShowList.tsx              Sortable list with distance column
    ShowMap.tsx               MapLibre map with org-coloured markers
    home.ts                   useHome() hook + localStorage helpers
  hooks/
    useShows.ts               Fetches and filters shows from /api/shows
    useRoutes.ts              Fetches driving routes from /api/route
  lib/
    store.ts                  Blob read/write + in-memory cache + migrations
    types.ts                  Show (FifeShow | TicaShow), CatzStore, ShowFilter
    shows-repo.ts             upsertShows, filtered list, detail helpers
    scrape-runs.ts            ScrapeRun record helpers
    geocode.ts                Nominatim client, rate-limited + cached
    route.ts                  OSRM client, cached
    normalize-country.ts      Country name normalisation map
    haversine.ts              Great-circle distance utility
    scrapers/
      fife.ts                 iCal parser → NormalisedFifeShow[]
      tica.ts                 HTML parser (Joomla TOES) → NormalisedTicaShow[]
      run.ts                  Orchestrates both scrapers + detail + geocode
scripts/
  scrape-all.ts               CLI entry point for the Actions job
  scrape-fife.ts              Smoke-test: FIFe only
  scrape-tica.ts              Smoke-test: TICA only
.github/workflows/
  scrape.yml                  Daily cron (03:23 UTC) + manual dispatch
  ci.yml                      PR checks: npm ci + npm test
docs/adr/
  0001-scrape-in-github-actions.md
  0002-keep-past-shows.md
```

## Data sources

- **FIFe** — iCal feed from Tribe Events on `fifeweb.org` (paginated,
  ~650–750 shows up to 3 years ahead)
- **TICA** — HTML-scraped from `shows.tica.org` (Joomla TOES component,
  paginated across seasons)

Each show is upserted by `(source, source_id)`. Re-running the scraper is
always safe. Past shows are kept in the store and hidden by default (see
[ADR 0002](docs/adr/0002-keep-past-shows.md)).

## Architecture

```
[FIFe site] ─┐
             ├─► scripts/scrape-all.ts (GitHub Actions cron, daily)
[TICA site] ─┘        │
                       ▼
              Vercel Blob: catz-data.json
              (shows, geocode_cache, scrape_runs, updated_at)
                       │
                       ▼
              Next.js API routes (read-only)
                       │
                       ▼
          React UI: Map | List | Calendar
          Three persona routes: / | /exhibitor | /organizer
```

### Store schema (`CatzStore`)

- `shows` — `FifeShow[]` + `TicaShow[]`, upserted by `(source, source_id)`
- `geocode_cache` — `Record<query, GeocodeResult | null>` (avoids re-hitting Nominatim)
- `scrape_runs` — operational log of each pipeline run
- `updated_at` — ISO timestamp of the last successful write

### External services & rate limits

| Service       | Purpose         | Rate limit   | Cached in store? | Env var           |
|---------------|-----------------|--------------|------------------|-------------------|
| Nominatim     | Geocoding        | 1 req/s      | Yes              | —                 |
| OSRM demo     | Driving routes   | Rate-limited | Per-request       | `CATZ_OSRM_BASE`  |
| OSM tiles     | Map tiles        | Usage policy | Browser           | —                 |
| fifeweb.org   | FIFe calendar    | Polite       | —                 | —                 |
| shows.tica.org| TICA calendar    | Polite       | —                 | —                 |

## Deployment (Vercel)

1. Connect the repo in your Vercel project.
2. Add the following environment variables in **Settings → Environment Variables**:
   - `BLOB_READ_WRITE_TOKEN` — a Vercel Blob token with read+write access to
     the `catz-data.json` blob
   - `CATZ_ADMIN_TOKEN` — a strong random string (e.g. `openssl rand -hex 32`)
     to protect the admin status API
3. Add `BLOB_READ_WRITE_TOKEN` as a GitHub repo secret (used by the Actions
   scrape job).
4. The first deploy will serve an empty store. Trigger the first scrape by
   running the workflow manually in GitHub Actions → **Scrape shows** →
   **Run workflow**, or wait for the next daily run.

### OSRM note

The default OSRM endpoint (`router.project-osrm.org`) is a public demo server
not intended for production traffic. Set `CATZ_OSRM_BASE` to a self-hosted
OSRM instance or a commercial routing provider before going live at scale.

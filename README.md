# catz

A unified calendar + map for **FIFe** and **TICA** cat shows. Built so exhibitors
(and curious visitors) can find shows in one place, filter by org / country /
date / search, and see driving distance from their home address.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind v4**
- **Postgres** via [`postgres`](https://github.com/porsager/postgres) driver (Neon in production)
- **MapLibre GL** + OpenStreetMap raster tiles
- **Nominatim** for geocoding (cached in `geocode_cache`)
- **OSRM** demo server for driving distance/time (cached in `route_cache`)

## Local development

### 1. Start a local Postgres database

```bash
docker compose up -d
```

This starts a `postgres:16` container on port 5432 with credentials `catz/catz/catz`.
Data is persisted in a named Docker volume (`catz_pgdata`).

### 2. Configure environment

```bash
cp .env.local.example .env.local
# The default DATABASE_URL in the example already points at the Docker container.
# Edit if needed.
```

### 3. Install and run

```bash
npm install
npm run dev
# http://localhost:3000
```

The database schema is created automatically on the first request.

### Seed it with shows

Visit [`/admin`](http://localhost:3000/admin) and click **Refresh now** — that
runs both scrapers and geocodes a batch of new shows. (No token is required in
dev. Set `CATZ_ADMIN_TOKEN` in production to require a `Bearer` header.)

You can also POST directly:

```bash
curl -X POST http://localhost:3000/api/admin/refresh
```

### Connecting to other databases locally

See `.env.local.example` for three pre-configured scenarios:

| Scenario | When to use |
|---|---|
| Local Docker (default) | Day-to-day development, no cloud account needed |
| Neon dev branch | Testing against real cloud infrastructure |
| Neon production | Debugging prod data locally (use a read-only role) |

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
    db.ts                       Postgres connection + schema (auto-migrated)
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

| Variable           | Required | Description                               |
|--------------------|----------|-------------------------------------------|
| `DATABASE_URL`     | **Yes**  | Postgres connection string                |
| `CATZ_ADMIN_TOKEN` | No       | Bearer token for `/api/admin/refresh`     |
| `CATZ_OSRM_BASE`   | No       | OSRM base URL                             |
| `CATZ_USER_AGENT`  | No       | User-Agent for external API calls         |

See `.env.local.example` for a template with all three local scenarios.

## Deployment

The app uses Postgres (via the [`postgres`](https://github.com/porsager/postgres)
driver) and deploys to Vercel with [Neon](https://neon.tech) as the database.

### Option A — Vercel × Neon integration (recommended)

1. Open your Vercel project → **Storage** tab → **Add** → **Postgres (Neon)**.
2. Follow the prompts. Vercel automatically injects `DATABASE_URL`, `PGHOST`,
   and friends into **all environments** (production, preview, local dev pull).
   No manual env var setup needed.
3. Redeploy — the schema is created automatically on the first request.

### Option B — Manual Neon

1. Create a project on [neon.tech](https://neon.tech).
2. Copy the **pooled connection string** from the Connection Details panel
   (select "Connection string" → enable "Pooling").
3. In Vercel → **Settings** → **Environment Variables**, add:
   - `DATABASE_URL` = the connection string above
4. Redeploy.

### First-run steps (both options)

1. Set `CATZ_ADMIN_TOKEN` in Vercel environment variables to a strong random
   string (e.g. `openssl rand -hex 32`).
2. Trigger the first scrape:
   ```bash
   curl -X POST https://your-app.vercel.app/api/admin/refresh \
     -H "Authorization: Bearer <your-token>"
   ```
3. Optionally configure a [Vercel Cron](https://vercel.com/docs/cron-jobs) job
   to run this daily.

### OSRM note

The default OSRM endpoint (`router.project-osrm.org`) is a public demo server
not suitable for production traffic. Set `CATZ_OSRM_BASE` to a self-hosted
OSRM instance or a commercial routing provider before going live.

### Preview environments

All Vercel preview deployments share the same Neon database by default. To
isolate preview data, enable
[Neon branching](https://neon.tech/docs/introduction/branching) and configure
Vercel to provide a per-branch connection string.

## Roadmap / future features

### Phase 2: Show details & judge filtering
- **Status (May 2026):** investigated; deferred. Public detail pages on
  `fifeweb.org` and `shows.tica.org` do **not** expose judges in their HTML
  (TICA hides them behind the entry/login flow; FIFe event pages only show
  metadata + organiser). Implementing this needs either:
  - per-organiser scraping (each FIFe member's own site / PDF announcements), or
  - an admin-curated `show_judges` table with a small editor UI in `/admin`.
- Once data exists, add a `show_judges` table (`show_id`, `judge_name`, `role`)
  and a multi-select judge filter in the sidebar.
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
- **Country normalisation** — the scrapers store country names as written
  upstream. The DB currently contains both English and native variants
  ("Sverige" / "Sweden", "Deutschland" / "Germany", "Belgique" / "Belgium",
  "México" / "Mexico", "España" / "Spain", "Brasil" / "Brazil",
  "Österreich" / "Austria", "Suisse" / "Switzerland", "Nederland" /
  "Netherlands", "Italia" / "Italy", "Danmark" / "Denmark", "Panamá" /
  "Panama") and a few rows where TICA appended `Regional` /
  `Annual` to the country (e.g. `DanmarkRegional`, `CanadaAnnual`). Build a
  proper normalisation map in `src/lib/scrapers/` and apply it on upsert so
  filters and the prefill helper match cleanly. There is already a
  client-side alias map in [`src/components/home.ts`](src/components/home.ts)
  (`COUNTRY_ALIASES` + `homeCountryAliases`) used by the prefill — that map
  is the canonical starting point.
- **Mobile responsive** — the current layout works but could benefit from
  a bottom-sheet filter UX on small screens.
- **Vercel KV** — hot cache layer for frequently-accessed show queries.
- **Scheduled geocoding** — a background job that geocodes remaining shows
  (current refresh budget is 80 sequential lookups per run; ~167 shows means
  it takes 2–3 refreshes to fully populate `lat`/`lng`).

### Deferred decisions / open notes from May 2026 session

These are explicit choices made (or postponed) during the May 2026 working
session. Read before picking up new work in those areas.

- **Storage: SQLite vs JSON-in-repo.** Real on-disk size is tiny (~150 KB
  total: 167 shows = ~20 KB of payload, 109 geocode entries = ~9 KB, 91
  routes, 11 scrape runs). The 2.8 MB WAL seen during dev was just an
  un-checkpointed journal. At this scale, JSON-in-repo is a reasonable
  alternative to the planned Postgres swap:
  - `data/shows.json` (committed, regenerated by a cron action) — perfect fit.
  - `data/geocode.json` (committed, append-only) — perfect fit, also frees
    Nominatim politeness budget across deploys.
  - `route_cache` is per-user (keyed on home coords); does **not** belong in
    the repo. Keep in SQLite, move to `localStorage`, or drop entirely.
  - `scrape_runs` is operational; drop or keep in a gitignored runtime DB.
  - Wins: no native `better-sqlite3` build, deploys to any static-friendly
    host (Vercel/Netlify/Cloudflare Pages) with no DB provisioning, git
    history doubles as a free changelog.
  - Caveats: JSON writes must be atomic (`writeFile` to temp + `rename`),
    one writer at a time. Revisit if shows ever exceed ~5000 rows or per-user
    state (favourites, attended-by) is added.
  - **Decision:** deferred. Stay on SQLite for now; reconsider before the
    Postgres migration in the deployment TODO above.

- **Country prefill UX.** When a home address is set, the country filter
  should be prefilled to the home country (with native-name aliases) so the
  initial `/api/shows` request doesn't pull every country. The helper is
  already in place — `homeCountryAliases(displayName)` in
  [`src/components/home.ts`](src/components/home.ts) — but it is **not yet
  wired into [`src/app/page.tsx`](src/app/page.tsx)**. To finish:
  1. In `HomePage`, on first load when `home` becomes available and
     `filters.countries` is empty, call
     `setFilters((f) => ({ ...f, countries: homeCountryAliases(home.display_name) }))`.
  2. Use the `ready` boolean from `useHome()` (already exposed) to avoid
     prefilling before localStorage has been read.
  3. Don't override an explicit user choice — only prefill if
     `filters.countries.length === 0`.
  4. On home clear, optionally clear the prefilled countries (track whether
     the current selection came from prefill vs user input).

- **Judges (Phase 2)** — investigation result documented in Phase 2 above.
  TL;DR: judges are not in the public HTML for either source as of May 2026.
  Either per-organiser scraping or admin-curated data is required.

- **Scraper concurrency.** `runAllScrapers(geocodeBudget = 80)` runs sources
  **sequentially** (was previously `Promise.all` with budget 25). Reason: the
  Nominatim rate limit is a single shared 1 req/s token; running scrapers in
  parallel splits the token unfairly and previously caused a 429 cascade.
  The fix in [`src/lib/geocode.ts`](src/lib/geocode.ts) is a forward-reserving
  rate limiter (claim slot before `await`) — this must be preserved if the
  scrapers are ever re-parallelised.

- **Route fetch cap.** [`src/app/page.tsx`](src/app/page.tsx) caps the
  per-pass `/api/route` batch at 100 destinations. The effect re-runs when
  `routes` changes and the `routes[s.id] === undefined` guard makes the loop
  self-terminating. If the show count grows past a few hundred, switch to a
  proper batched loop with a small inter-batch delay.

# Changelog

Brief record of significant changes. Newest first. Each entry covers a PR or logical unit of work.

---

## PR #17 — Org separation + show detail fetching

**Type system split** (`src/lib/types.ts`)
- `Show` is now `FifeShow | TicaShow` discriminated union; `NormalisedShow` split into `NormalisedFifeShow | NormalisedTicaShow`
- `FifeShow` adds `show_type`, `website_url`, `detail_fetched`
- `TicaShow` adds `show_format`, `flyer_url`, `detail_fetched`
- `ShowWithDistance` changed from `interface extends Show` to `type = Show & {...}` (required by union)

**TICA detail fetching wired** (`src/lib/scrapers/run.ts`, `tica.ts`)
- `runAllScrapers` batch-fetches TICA detail pages after each calendar scrape
- Budget-capped at 30/run, rate-limited 1 req/sec; `detail_fetched` flag prevents re-fetching
- Fields: `show_format` (e.g. "Alternative"), `flyer_url` (club flyer / website)

**FIFe detail fetching added** (`src/lib/scrapers/fife.ts`)
- `parseFifeDetail` / `fetchFifeDetail` fetch each show's fifeweb.org event page
- Fields: `show_type` (e.g. "Two 1 day, 2 cert."), `website_url` (organizer's site from JSON-LD)
- Same batch/budget pattern as TICA

**Data integrity**
- `upsertShows` preserves detail fields on calendar-scrape updates (scraper output never carries them)
- Store migration backfills new fields on existing blob data (one-pass, idempotent, write-back on change)

**UI** (`src/components/ShowList.tsx`)
- `show_type` / `show_format` shown below title in list view
- Club website (🌐 FIFe) and flyer link (📄 TICA) added alongside source ↗ link

---

## PR #16 (squash) — Country normalization + blob data migration

- `src/lib/normalize-country.ts`: alias table for ~30 non-English country name variants; strips TICA's `Regional`/`Region`/`Annual` suffixes
- Applied at upsert time in `upsertShows` (covers all orgs)
- `migrateStore` in `store.ts` backfills existing blob data on load and writes back if anything changed

---

## PR #15 (squash) — Country normalization (initial)

- First version of `normalizeCountry` — basic alias table and suffix stripping
- Applied in `upsertShows`

---

## PR #4 (squash) — JSON blob store + Vercel deployment

- Replaced SQLite with a single JSON blob (`catz-data.json`) via `@vercel/blob`
- Local fallback: `.data/catz.json` (or `/tmp/catz.json` on Vercel)
- `getOrLoadStore`: in-memory cache + stale-while-revalidate background refresh
- Blocking first-run scrape so the first visitor gets results immediately
- `/api/debug` endpoint hidden on production deployments

---

## MVP — Initial build

- FIFe iCal scraper (`fetchFife`) + TICA HTML scraper (`fetchTica`)
- Nominatim geocoding (1 req/sec, cached in store)
- OSRM routing for drive-distance from home address
- List / Calendar / Map views; org badges (FIFe = blue, TICA = rose)
- Country + org + date + text + radius filters
- Home address persisted in `localStorage`
- Admin page + `/api/admin/refresh` trigger

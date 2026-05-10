# Changelog

Brief record of significant changes. Newest first. Each entry covers a PR or logical unit of work.

---

## GH #11 — Persona routes (visitor / exhibitor / organizer)

**Route structure**
- `/` — Visitor page: map-first default, minimal filter sidebar (date + country + distance only), no org toggle or search box
- `/exhibitor` — Exhibitor page: full filter sidebar, list default view, show_type/show_format/website/flyer links all visible
- `/organizer` — Organizer stub: placeholder with "Timeline view coming soon" message

**Shared hooks extracted** (`src/hooks/`)
- `useShows.ts` — wraps `/api/shows` fetch with AbortController; returns `{ shows, countries, loading }`
- `useRoutes.ts` — wraps `/api/route` batch fetch with Haversine fallback; accumulates routes across re-renders

**New files**
- `src/lib/haversine.ts` — pure Haversine distance function (extracted from page.tsx)
- `src/components/PersonaNav.tsx` — thin tab bar in layout; highlights active route via `usePathname()`
- `src/app/exhibitor/page.tsx` — full exhibitor view
- `src/app/organizer/page.tsx` — organizer stub

**Modified components**
- `FilterSidebar`: `variant="visitor"` hides Organisation + Search sections; visitor distance slider capped at 500 km with "Show all" checkbox; `defaultVisitorFilters` exported with `maxDistanceKm: 50`
- `ShowList`: `variant="visitor"` hides show_type/show_format rows; external links (↗ / 🌐 / 📄) kept in both variants
- `src/app/layout.tsx`: `<PersonaNav />` added above `{children}`
- `src/app/page.tsx`: rewritten as visitor page (map default, visitor sidebar/list variants)

**Verification**
Visit all three routes after any UI change: `/` (visitor, map default), `/exhibitor` (list default, full filters), `/organizer` (stub). PersonaNav must highlight the active route on each. Home address (localStorage) persists across all three.

---

## commit bbe8d60 — Unit tests (#9)

**Vitest setup** (`vitest.config.ts`, `package.json`)
- `npm test` — one-shot run; `npm run test:watch` — watch mode
- Node environment, `@/*` alias mirrors tsconfig

**Test coverage** (43 tests across 4 files)
- `parseICal` + `parseFifeDetail` — iCal parsing, line unfolding, optional fields, detail extraction
- `parseTica` + `parseTicaDetail` — HTML parsing, month-boundary date ranges, single-day shows
- `normalizeCountry` — aliases, suffix stripping, case-insensitivity, kanji, unknown pass-through
- `upsertShows` — insert/update/mixed batch, **detail-field preservation on re-scrape** (both orgs),
  country normalization, ID auto-increment; plus `setFifeDetail`, `setTicaDetail`,
  `listFifeShowsMissingDetail`, `listTicaShowsMissingDetail`

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

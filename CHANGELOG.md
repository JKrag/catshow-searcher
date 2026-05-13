# Changelog

Brief record of significant changes. Newest first. Each entry covers a PR or logical unit of work.

---

## feat/tica-season-pagination — TICA multi-season fetch

- `fetchTica()` previously fetched only the current season (~144 shows)
- TICA organises shows by season (May N → April N+1); navigation is via POST with `season_year=N`
- Fix: detect current season year from the page, then POST for each subsequent season up to
  `currentYear + 3`, stopping when a season returns 0 shows
- Result: 205 shows across 4 seasons (through April 2030) vs ~144 before
- Adds `scripts/scrape-tica.ts` (`npm run scrape:tica`) for live smoke-testing
- `WORLD-KNOWLEDGE.md` updated with POST pagination details

---

## Issue #21 — FIFe iCal pagination (3-year window)

- `fetchFife()` previously fetched only the first iCal page (~30 events, covering roughly the next 2–3 months)
- The FIFe calendar paginates via `…/page/N/?ical=1` and extends to ~2035 across ~49 pages
- Fix: paginated loop with a 3-year cutoff; stops on an empty page or when any event in a batch exceeds the cutoff; 300 ms polite delay between pages
- Extracted `normaliseFifeEvent()` helper for testability; `fifePageUrl()` builds the correct path-based URL
- Expected result: ~660–750 FIFe shows in the store vs ~38 before
- `WORLD-KNOWLEDGE.md` updated with canonical pagination URL pattern and notes on `tribe_paged` not working
- `scripts/scrape-fife.ts` added (`npm run scrape:fife`) — smoke-tests the scraper against the live endpoint without starting the full app

---

## 88e86da — Bug fixes: home address state + stale-data judge visibility

**HomeAddressInput state isolation**
- `HomeAddressInput` was calling its own `useHome()` in isolation; setting an address updated only the component's local state, not the page-level `home`
- `homeSet` was always `false` until page reload → distance slider never appeared, distance column never showed
- Fix: `home`/`setHome` lifted to page level and passed as required props to `HomeAddressInput` on all three routes

**Stale store / judges invisible on first load**
- When the blob store is >24h old the server returns old data and starts a background scrape; judge names (populated by the detail-fetch step) only appeared after a filter change happened to coincide with the scrape progressing
- Fix: `/api/shows` now includes `stale: boolean`; `useShows` schedules a silent re-fetch after 8 s when stale, so freshly-scraped judge data surfaces automatically without any user action

---

## PR #20 — TICA judge names (scrape, store, display, filter)

**Data layer**
- `TicaShow` gains `judges: string[] | null` field
- `parseTicaDetail` extracts judges from `<div class="judges">` block on the TICA detail endpoint
- Parser strips AM/PM session prefixes, deduplicates across days/rings, handles accented/hyphenated names
- `setTicaDetail` updated with 5th `judges` param; store migration backfills `judges: null` on existing TICA shows
- 6 new Vitest tests for judge parsing (49 total)

**UI**
- Exhibitor list: judges displayed as `Name(Ring) · Name(Ring)` below title for TICA shows with data
- Exhibitor sidebar: "Judge" search section filters to confirmed matches only — shows with no judge data are excluded when a query is typed
- Hint text: "Only TICA shows with a confirmed match are shown."

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
- `FilterSidebar`: `variant="visitor"` hides Organisation + Search sections; visitor distance slider capped at 500 km with "Show all" checkbox; `defaultVisitorFilters` exported with `maxDistanceKm: 200`
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

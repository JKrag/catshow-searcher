# Roadmap

## Phase 1 — Quick wins & data quality

### #5 Country normalization ✅
Done. `src/lib/normalize-country.ts` — strips TICA's `Regional`/`Region` suffix and maps
~25 non-English country names to English canonical forms. Applied in `upsertShows` so it
covers all orgs automatically. Store migration backfills existing blob data on load.

**Deferred:** The alias table is static and silently passes through unknown strings. Extend
it whenever a new non-English or oddly-formatted country appears in scraped data.

### #7 + #13 — TICA direct link & show detail fetching ✅
Done. URL fixed to `shows#show{id}` format. `parseTicaDetail()` / `fetchTicaDetail()`
implemented in `src/lib/scrapers/tica.ts` and wired into `runAllScrapers` as a batch step
(see #6 / #14 below).

---

## Phase 2 — Architecture

### #6 — Separate TICA/FIFe handling ✅
Done. `Show` is now a `FifeShow | TicaShow` discriminated union; `NormalisedShow` is split
into `NormalisedFifeShow | NormalisedTicaShow`. Each org carries its own extended fields
without polluting the shared schema. Store migration is one-pass and idempotent.

---

## Phase 3 — Data enrichment

### #14 — Show format / show type field ✅
Done. Both orgs fetch per-show detail pages as a batch step after the main calendar scrape
(rate-limited to 1 req/sec, budget-capped at 30/run per org; `detail_fetched` flag prevents
re-fetching).

- **TICA:** `show_format` (e.g. "Alternative") parsed from the detail endpoint.
- **FIFe:** `show_type` (e.g. "Two 1 day, 2 cert.") parsed from the event page on fifeweb.org.

Both fields are displayed below the title in the list view.

### #8 — External links (flyer / show website) ✅
Done alongside #14.

- **TICA:** `flyer_url` parsed from the detail endpoint; displayed as a 📄 link.
- **FIFe:** `website_url` (organizer's site from JSON-LD) parsed from event pages; displayed
  as a 🌐 link.

Both links appear in the list view alongside the source ↗ link.

---

## Phase 4 — Quality gates

### #9 — Unit tests ✅
Done. Vitest with node environment and `@/*` alias. Run with `npm test` (one-shot) or
`npm run test:watch` (watch mode). 43 tests across 4 files:
- `src/lib/scrapers/__tests__/fife.test.ts` — `parseICal`, `parseFifeDetail`
- `src/lib/scrapers/__tests__/tica.test.ts` — `parseTica`, `parseTicaDetail`
- `src/lib/__tests__/normalize-country.test.ts` — `normalizeCountry`
- `src/lib/__tests__/shows-repo.test.ts` — `upsertShows`, `setFifeDetail`, `setTicaDetail`,
  `listFifeShowsMissingDetail`, `listTicaShowsMissingDetail`

Tests cover the critical "preserve detail fields on update" path in `upsertShows`.

### #10 — CI pipeline (GitHub Actions) ✅
Done. GitHub Actions workflow triggers on pull_request to main. Runs `npm ci` + `npm test`
(Vitest) on Node 22. Lint and build checks deferred — test coverage is the critical gate.

---

## Phase 5 — Big-picture UX

### #11 — Redesign for user groups (Epic) ✅
Done. Three URL-based persona routes implemented:

- `/` — **Visitor**: map default, minimal sidebar (date + country + distance, 200 km default, 500 km max, "Show all" checkbox), no org/search filters
- `/exhibitor` — **Exhibitor**: full sidebar with all 5 sections, list default, show_type/format/links all shown
- `/organizer` — **Organizer**: stub with "Timeline view coming soon" placeholder

Shared hooks (`useShows`, `useRoutes`), `PersonaNav` component, and `haversine.ts` utility extracted/created. `FilterSidebar` and `ShowList` both accept a `variant` prop.

**Deferred to follow-up issues:** AB/SP ring counts, entry fees, opening hours, and the full organizer timeline/spacing-rule engine.

### #21 — FIFe iCal pagination ✅
Done. `fetchFife()` in `src/lib/scrapers/fife.ts` now paginates through all iCal pages
(`…/page/N/?ical=1`) up to a configurable cutoff (default 3 years ahead) instead of
fetching only the first 30 events. Stops on an empty page or when any event in a batch
exceeds the cutoff. Expect ~660–750 FIFe shows vs ~38 before.

## Phase 6 — "Actually usable" milestone (scoped 2026-07-07)

Production has not successfully scraped since 2026-05-08: the full pipeline
(pagination + detail fetch + geocoding at ~1 req/s) takes 10–20 min and cannot
fit any Vercel function lifetime, so every `waitUntil` background refresh died
silently. This explains both #27 (slow/opaque refresh) and #28 (judge filter
appears broken — judges were simply never fetched). See ADR 0001.

### 6.1 — Scrape pipeline in GitHub Actions (#27, root cause of #28) ✅
- New `scripts/scrape-all.ts` runs the **full** pipeline (calendar scrape →
  detail fetch → geocode) and writes the store. Locally it writes
  `.data/catz.json`; with `BLOB_READ_WRITE_TOKEN` it reads/writes the blob
  (must read-modify-write to preserve `geocode_cache` and `detail_fetched`).
- Daily GitHub Actions cron workflow runs the script against the blob.
- Remove the per-run detail budget caps (keep 1 req/s politeness) so judges
  populate fully in one run.
- Delete the in-app `waitUntil` stale-refresh and the blocking first-run
  scrape; the app becomes read-only against the blob.

### 6.2 — Admin page → status dashboard ✅
- Remove the "Refresh now" trigger (see ADR 0001).
- Show: blob `updated_at`/age, show counts per org, detail-fetch and geocode
  coverage, `scrape_runs` history, link to the GitHub Actions runs page.

### 6.3 — #25 Future shows by default ✅
- API defaults to `from=today` (UTC) when no `from` or `include_past=1` param
  is provided. `listShows` already compares `end_date >= from`, so in-progress
  shows (started before today, ending today-or-later) remain visible. Past
  shows are never purged — see ADR 0002.
- UI: "Include past shows" checkbox added to the date-range section in both
  visitor and exhibitor sidebar variants (default unchecked). When checked,
  `include_past=1` is sent; an explicit `from` date picker selection always
  overrides this toggle.
- New pure function `resolveFromFilter` in `src/lib/api-filter.ts`; covered
  by 4 unit tests in `src/lib/__tests__/api-filter.test.ts`.

### 6.4 — Data-freshness indicator ✅
- API response now includes `updated_at` (ISO string from `store.updated_at`)
  alongside the existing `stale` boolean.
- `useShows` hook exposes `updatedAt` and `stale` to callers.
- New component `src/components/DataFreshness.tsx`: shows "Updated X ago"
  with a tooltip for the absolute timestamp; amber-styled when `stale=true`.
  Rendered on all three persona routes (`/`, `/exhibitor`, `/organizer`).

### 6.5 — #24 Privacy notice ✅
- Short transparency text near the home-address input: stored in your browser
  only; sent to Nominatim for coordinate lookup; not stored on our servers.

### 6.6 — Docs & tracker hygiene ✅ (issue closing pending merge)
- Rewrite README (it still describes the abandoned Postgres/Neon + docker
  setup; actual data layer is the `@vercel/blob` JSON store).
- Close done issues: #6, #7, #8, #11, #26. Re-verify #28 after the first full
  Actions run populates judge data; only then debug the filter itself if
  still broken.

### Deferred (explicitly out of this milestone)
- katteudstilling.dk custom domain (drags in Danish i18n expectations, #12)
- FIFe judge data investigation (unknown-sized; TICA-only judges acceptable)

---

### #12 — Internationalization
The domain `katteudstilling.dk` suggests a Danish entry point alongside an international one.
Add multi-language support once the UI is stable. Doing this last avoids duplicating i18n work
on components that are still changing.

---

## Summary table

| Priority | Issue | Status | Depends on |
|----------|-------|--------|------------|
| 1 | #5 Country normalization | ✅ Done | — |
| 2 | #7 + #13 TICA details & direct link | ✅ Done | — |
| 3 | #6 TICA/FIFe separation | ✅ Done | #13 |
| 4 | #14 Show format / show type | ✅ Done | #6 |
| 5 | #8 External links | ✅ Done | #6 |
| 6 | #9 Unit tests | ✅ Done | #6 (architecture stable) |
| 7 | #10 CI pipeline | ✅ Done | #9 |
| 8 | #11 Redesign epic | ✅ Done | — |
| 9 | PR #20 TICA judge names | ✅ Done | #11 |
| 10 | #21 FIFe iCal pagination | ✅ Done | — |
| 11 | #12 Internationalization | Pending | #11 (UI stable) |

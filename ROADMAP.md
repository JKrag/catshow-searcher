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

### #6 — Separate TICA/FIFe handling (partially complete)
Current status after re-check:

- ✅ Done: type-level separation (`Show = FifeShow | TicaShow`, org-specific normalized types).
- ✅ Done: org-specific detail fields and detail-fetch logic for FIFe/TICA.
- ❌ Not done: separate per-org data files (storage is still one blob: `catz-data.json`).
- ❌ Not done: plugin-style org modules with a shared contract.
- ❌ Not done: source-specific refresh scheduling/intervals.
- ❌ Not done: plugin-owned detail rendering.

Break remaining work into these sub-issues:

- [ ] **#6A — Introduce an org plugin contract**
  - Define a shared backend contract each org module must implement (base show projection,
    scrape function, optional detail enrichment function, source id).
  - Add a central registry so the scraper runner iterates plugins instead of hardcoding FIFe/TICA.

- [ ] **#6B — Split storage into per-org blobs with independent schema versions**
  - Replace single `catz-data.json` with separate org blobs (for example `catz-fife.json`,
    `catz-tica.json`) plus shared caches where appropriate.
  - Add idempotent migrations per org blob schema.
  - Keep API response shape for `/api/shows` backward compatible.

- [ ] **#6C — Enable source-scoped refresh and independent refresh cadence**
  - Add source filter support to admin refresh flow (run one org or all).
  - Track last-refresh metadata per source so different intervals can be configured later.
  - Preserve current default behavior when no source filter is provided.

- [ ] **#6D — Extract org-specific detail rendering into pluggable UI components**
  - Keep shared list/map/calendar shell.
  - Move org-specific detail snippets (show type/format, extra links, future ring/day fields) into
    per-org renderers selected by source.
  - Ensure unknown/future orgs degrade gracefully with base fields only.

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

### #11 — Redesign for user groups (Epic)
Three distinct personas with different needs:

- **Show visitor** — general public; cares about nearby shows, opening hours, entry fee; not
  interested in judges or ring counts.
- **Exhibitor** — wants distances, judge names, ring counts; for TICA: AB vs SP rings; for
  FIFe: 1- vs 2-certificate shows and special shows.
- **Show organizer** — plans 1–2 years out; needs to know spacing rules (FIFe: ≥100 km and
  ≥2 weeks from other FIFe shows); timeline/calendar view of future slots.

Needs a design session and a written design doc before any code. Break into implementable
sub-issues first.

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
| 3 | #6 TICA/FIFe separation | Partially complete (split into #6A–#6D) | #13 |
| 4 | #14 Show format / show type | ✅ Done | #6 |
| 5 | #8 External links | ✅ Done | #6 |
| 6 | #9 Unit tests | ✅ Done | #6 (architecture stable) |
| 7 | #10 CI pipeline | ✅ Done | #9 |
| 8 | #11 Redesign epic | Pending | design doc first |
| 9 | #12 Internationalization | Pending | #11 (UI stable) |

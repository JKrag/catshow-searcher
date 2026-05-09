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

### #10 — CI pipeline (GitHub Actions)
Comes after #9 — no point wiring up CI before tests exist. Add lint + test + build checks.

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
| 3 | #6 TICA/FIFe separation | ✅ Done | #13 |
| 4 | #14 Show format / show type | ✅ Done | #6 |
| 5 | #8 External links | ✅ Done | #6 |
| 6 | #9 Unit tests | ✅ Done | #6 (architecture stable) |
| 7 | #10 CI pipeline | Pending | #9 |
| 8 | #11 Redesign epic | Pending | design doc first |
| 9 | #12 Internationalization | Pending | #11 (UI stable) |

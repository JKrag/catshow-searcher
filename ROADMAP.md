# Roadmap

## Phase 1 — Quick wins & data quality

### #5 Country normalization ✅
Done. `src/lib/normalize-country.ts` — strips TICA's `Regional`/`Region` suffix and maps
~25 non-English country names to English canonical forms. Applied in `upsertShows` so it
covers all orgs automatically.

**Deferred:** The alias table is static and silently passes through unknown strings. Extend
it whenever a new non-English or oddly-formatted country appears in scraped data.

### #7 + #13 — TICA direct link & show detail fetching ✅
Done. URL fixed to `shows#show{id}` format. `parseTicaDetail()` / `fetchTicaDetail()`
implemented in `src/lib/scrapers/tica.ts`.

**Deferred:** Detail fetching is not yet wired into the main scrape. The functions are ready;
wire them up as part of #14 (show format) and #8 (external links) after the #6 architecture
split. Key facts to remember when doing that:
- Detail endpoint: `GET /index.php?option=com_toes&view=show&layout=short&id={id}&tmpl=component`
  (follows a redirect; needs browser-like User-Agent + `Referer: https://shows.tica.org/en/component/toes/shows`)
- ~135 shows on the calendar — treat like geocoding (batch job, not inline per-scrape)
- Available fields: `show_format` (e.g. "Alternative"), `flyer_url` (club website/flyer link)
- Flyer URLs are real and populated for European shows (Danish, Dutch, UK shows confirmed)

---

## Phase 2 — Architecture

### #6 — Separate TICA/FIFe handling
Architectural refactor. Must happen before adding more org-specific fields — doing it after
would require refactoring those additions too. The right timing is after the TICA extended
fields are understood (#13 done, ✅) but before they are added in earnest.

Suggested breakdown:
1. Split the JSON store into `fife.json` / `tica.json` with a shared base schema
2. Define per-org extended fields: TICA gets `show_format`, `flyer_url` (infrastructure
   already in `tica.ts`); FIFe gets equivalent fields sourced from the iCal summary
3. Standardize the "plugin" API surface (what each scraper must expose)
4. Per-org detail view rendering

---

## Phase 3 — Data enrichment

### #14 — Show format / show type field
With the type system separated, add `show_format` to both scrapers and surface it in the list
view and map popups. FIFe shows have a "Show type" line (e.g. "Two 1 day, 2 cert."); TICA
shows have an equivalent "Show format" field (e.g. "Alternative").

**For TICA:** call `fetchTicaDetail()` (already implemented in `tica.ts`) as a batch step
after the main scrape, the same way geocoding works — only fetch for shows that are missing
`show_format`. Wire result into the per-org extended schema defined in #6.

### #8 — External links (flyer / show website)
Most shows link out to a club flyer or website in their detail view. Grab this during scraping
and surface it in the UI. Depends on the extended schema existing (#6).

**For TICA:** `flyer_url` is already parsed by `parseTicaDetail()` — just needs to be stored
and displayed. European shows confirmed to have real URLs (Danish, Dutch, UK shows tested).

---

## Phase 4 — Quality gates

### #9 — Unit tests
Best added after the architecture settles (post-#6). Focus first on scrapers (pure functions,
easy to test) and the country-normalization logic from #5.

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

| Priority | Issue | Depends on |
|----------|-------|------------|
| 1 | #5 Country normalization | — |
| 2 | #7 + #13 TICA details & direct link | — |
| 3 | #6 TICA/FIFe separation | #13 (field inventory) |
| 4 | #14 Show format field | #6 |
| 5 | #8 External links | #13, #6 |
| 6 | #9 Unit tests | #6 (architecture stable) |
| 7 | #10 CI pipeline | #9 |
| 8 | #11 Redesign epic | design doc first |
| 9 | #12 Internationalization | #11 (UI stable) |

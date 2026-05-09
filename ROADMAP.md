# Roadmap

## Phase 1 — Quick wins & data quality

### #5 Country normalization
Standalone fix with no dependencies. Country strings returned from scrapers need to be
normalized so each country only appears once in the filter (e.g. "Danmark" / "DanmarkRegional"
/ "Denmark" → one canonical entry). Likely a normalization step in the scraper or DB query.

### #7 + #13 — TICA direct link & show detail fetching (together)
These are tightly coupled. #13 ("figure out how to fetch more show details") is the
investigation that unblocks #7 ("grab the per-show direct URL"). Do them as one piece of
work: explore the TICA show detail API/page, extract the direct link (e.g.
`https://shows.tica.org/en/component/toes/shows#show3129`), and document what other fields
are available for later phases.

---

## Phase 2 — Architecture

### #6 — Separate TICA/FIFe handling
Architectural refactor. Must happen before adding more org-specific fields — doing it after
would require refactoring those additions too. The right timing is after the TICA extended
fields are understood (#13 done) but before they are added in earnest.

Suggested breakdown:
1. Split the JSON store into `fife.json` / `tica.json` with a shared base schema
2. Define per-org extended fields (informed by #13/#14 research)
3. Standardize the "plugin" API surface (what each scraper must expose)
4. Per-org detail view rendering

---

## Phase 3 — Data enrichment

### #14 — Show format / show type field
With the type system separated, add `showFormat`/`showType` to both scrapers and surface it
in the list view and map popups. FIFe shows have a "Show type" line (e.g. "Two 1 day, 2
cert."); TICA shows have an equivalent "Show format" field.

### #8 — External links (flyer / show website)
Most shows link out to a club flyer or website in their detail view. Grab this during scraping
and surface it in the UI. Depends on understanding TICA detail fetching (#13) and on the
extended schema existing (#6).

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

@AGENTS.md

## Project context

Catz is a cat show finder that combines FIFe and TICA show calendars into one
UI with map, calendar, and list views. See README.md for architecture overview.

## Key conventions

- Data layer: single JSON blob via `@vercel/blob` (`catz-data.json`). Local
  fallback at `.data/catz.json`. See `src/lib/store.ts`.
- `CatzStore` is the blob schema: `shows[]`, `geocode_cache`, `scrape_runs`, `updated_at`.
- `Show` is a discriminated union: `FifeShow | TicaShow` (see `src/lib/types.ts`).
  Always upsert by `(source, source_id)` via `upsertShows` in `src/lib/shows-repo.ts`.
- Scrapers in `src/lib/scrapers/` return `NormalisedFifeShow[]` or `NormalisedTicaShow[]`.
- Detail fetching (show type, website/flyer) is a post-scrape batch job — rate-limited
  to 1 req/sec, budget-capped. `detail_fetched` flag prevents re-fetching.
- Store migrations run on every load (`migrateStore` in `store.ts`) and write back
  if anything changed — keep them idempotent.
- External API calls (Nominatim, OSRM, fifeweb.org, shows.tica.org) are rate-limited.
  See WORLD-KNOWLEDGE.md for exact endpoints, headers, and quirks.
- UI is all client components (`"use client"`) since the page fetches data
  via `/api/shows`. Filter state is local React state.
- Home address is persisted in `localStorage` (key: `catz.home`).
- FIFe = blue, TICA = rose — consistent across badges, calendar cells, and map markers.

## Testing

Run the test suite before committing any change to the logic layer:

```
npm test            # one-shot (use in CI and before commits)
npm run test:watch  # watch mode for TDD
```

Tests live in `src/**/__tests__/`. The four test files cover the pure-function core:
`parseICal`, `parseFifeDetail`, `parseTica`, `parseTicaDetail`, `normalizeCountry`,
and `upsertShows` (including the critical "preserve detail fields on update" path).

When adding new pure functions to scrapers, `normalize-country.ts`, or `shows-repo.ts`,
add matching tests. Tests for Next.js API routes and React components are not yet set up.

To smoke-test a scraper against the live endpoint without starting the full app:

```
npm run scrape:fife   # calls fetchFife() and prints count + date range
```

Script lives at `scripts/scrape-fife.ts`. Runs via Node's `--experimental-strip-types`
(Node 22+) — no extra dependencies needed. Use this after any change to `fife.ts` that
affects network behaviour.

## Tool usage

Prefer built-in tools over Bash for file operations — they are cheaper on tokens:
- Read a file → `Read` tool, not `cat` / `head` / `tail`
- Edit a file → `Edit` or `Write` tool, not `sed` / `awk` / heredoc
- Reserve `Bash` for things that genuinely need a shell: running the compiler,
  git commands, package scripts, curl, grep across many files.

## Living documents — keep these up to date

When you make changes, update the relevant files before committing:

| File | Update when |
|------|-------------|
| `ROADMAP.md` | An issue is completed (mark ✅) or a new one is scoped |
| `CHANGELOG.md` | A PR is ready — add a section summarising what changed and why |
| `WORLD-KNOWLEDGE.md` | You discover or correct a fact about an external system (URL format, auth requirements, field structure, rate limits) |

## UI routes — verify all three after any UI change

Three persona routes exist; each must be checked after UI/component changes:

| Route | Persona | Default view | Sidebar variant |
|-------|---------|--------------|-----------------|
| `/` | Visitor | Map | `visitor` — date, country, distance only |
| `/exhibitor` | Exhibitor | List | `full` — all 5 sections |
| `/organizer` | Organizer | — | stub placeholder |

`PersonaNav` (in `layout.tsx`) must highlight the active route on each.
Home address (`localStorage`) persists across all three.

## What's done

All core features work end-to-end: scraping both FIFe and TICA, detail-page
fetching (show type + club website/flyer), geocoding, routing, filtered API,
list/calendar/map views with org badges, home address + distance.
Three persona routes (`/`, `/exhibitor`, `/organizer`) with shared hooks.

See CHANGELOG.md for a full history. See ROADMAP.md for what's next.

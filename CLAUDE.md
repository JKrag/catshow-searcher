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

## What's done

All core features work end-to-end: scraping both FIFe and TICA, detail-page
fetching (show type + club website/flyer), geocoding, routing, filtered API,
list/calendar/map views with org badges, home address + distance.

See CHANGELOG.md for a full history. See ROADMAP.md for what's next.

# Implementation plan — Organizer view (`/organizer`)

Status: ready to implement. Design decisions below were resolved in a grilling
session on 2026-07-09; provisional ones are marked **[experiment]** and should
ship behind the cheapest reasonable implementation, then iterate on test-user
feedback.

## What this is

Decision support for a club planning a show ("Candidate"): *"We want a show
somewhere in eastern Denmark, early Sept to mid Oct 2027 — what are we up
against?"* Read-only; no accounts, no persistence beyond the URL.

Read first: `CONTEXT.md` (glossary: Candidate, Blast radius, Show weekend),
`WORLD-KNOWLEDGE.md` §"FIFe Show separation rule" and §"TICA show separation",
`AGENTS.md` (read the Next.js guides in `node_modules/next/dist/docs/` before
writing page/route code — this Next.js version differs from training data).

## Resolved design

1. **Candidate input**: a draggable pin on the map + a from–to date window +
   an "Organising: FIFe / TICA / other" selector. The selector controls ONLY
   which blast radius is drawn/evaluated ("other" = none). All shows from both
   orgs are always visible (org filter toggles like other views).
2. **Timeline = distance-over-date scatter** (x = date, y = straight-line km
   from pin, dot per show, org-coloured, hollow = approximate location).
   Horizontal rule lines at 400 km (FIFe) and 805 km (TICA), drawn only when
   the corresponding org is selected. Candidate window shaded on the x-axis.
3. **Weekend detail**: clicking a weekend column in the scatter opens a detail
   panel for that weekend: show chips with club, city/country, exact road
   distance (fetched on demand), links, and conflict status.
4. **Map radii are selection-driven [experiment]**: default = one circle around
   the pin; when a weekend is selected, invert — circles around that weekend's
   shows paint no-go zones, gaps = safe area.
5. **Competition cap**: scatter y-axis 0–1500 km; shows beyond 1500 km collapse
   into a per-weekend "+N further away" count above the chart. Shows without
   coordinates are counted in a banner ("N shows in this window have no
   location"), never silently dropped.
6. **Conflict semantics** (the heart — see WP1):
   - FIFe candidate vs FIFe show, overlapping **days**: haversine < 400 km →
     *potential* conflict; verify by road via OSRM → road < 400 km =
     **hard conflict**, road ≥ 400 km = clear. Haversine ≥ 400 km can never
     conflict (road ≥ straight line) — no OSRM call needed.
   - TICA candidate vs TICA show, same **weekend**: straight-line < 805 km =
     **permission needed** (rule 22.1.2 is Regional-Director-gated, not
     absolute — label it "needs permission", not "forbidden"). TICA's
     "same region" clause is OUT OF SCOPE (we have no region data); note this
     in the UI footnote.
   - Shows with `geo_precision` of `city`/`country`: treat conservatively —
     flag as potential conflict with an "approximate location" marker; never
     declare them hard conflicts on OSRM alone.
   - Cross-org shows are never rule conflicts, only soft competition.
7. **State in URL params** (`?lat&lng&from&to&org`), so a plan is shareable
   with a club committee. localStorage remembers the last candidate as a
   convenience. *(Default decision — not user-validated; cheap to change.)*

## Existing building blocks (do not reinvent)

| Need | Existing code |
|---|---|
| Straight-line distance | `src/lib/haversine.ts` |
| Road distance (batch, cached) | `POST /api/route` + `src/hooks/useRoutes.ts` |
| Show fetch with window filter | `useShows` (`from`/`to`/`include_past` params) |
| Circle polygon on map | `circlePolygon()` in `src/components/ShowMap.tsx` (extract, don't copy) |
| Org colours / badges | `src/components/OrgBadge.tsx` (FIFe blue, TICA rose) |
| Approximate-location marker style | hollow dot, see `ShowMap.tsx` |
| Page scaffold, nav, freshness | `src/app/organizer/page.tsx` (stub), `PersonaNav`, `DataFreshness` |

## Work packages

Rules for every WP: disjoint file ownership; `npm test` green before done; new
pure functions get Vitest tests in `src/**/__tests__/`; NO weakening of
existing tests; if you take a shortcut, mark it with a comment AND report it in
your summary. Don't run `npm run dev`/`build` if other agents share the tree.

### WP1 — Conflict engine (pure logic) — **Sonnet or capable local model**

New file `src/lib/organizer.ts` + `src/lib/__tests__/organizer.test.ts`.
No I/O, no React. This blocks nothing: WP2–4 code against the signatures below.

```ts
export type CandidateOrg = "FIFe" | "TICA" | "other";
export interface Candidate {
  lat: number; lng: number;
  from: string; to: string;      // YYYY-MM-DD, inclusive
  org: CandidateOrg;
}
// Saturday (ISO date) of the show's weekend. Sat/Sun/Fri-start shows map to
// that weekend's Saturday; Mon–Thu starts map to the *following* Saturday.
export function weekendKey(date: string): string;
// All weekend keys covered by [from, to].
export function weekendsInWindow(from: string, to: string): string[];
export type ConflictStatus =
  | "hard"            // FIFe same-day, road-verified < 400 km
  | "potential"       // haversine < 400 km, road distance not yet known
  | "permission"      // TICA same weekend < 805 km straight-line
  | "approximate"     // would conflict but show location is city/country-level
  | "competition";    // everything else visible (soft)
export interface AssessedShow {
  show: ShowWithDistance;        // distance_km = haversine from pin here
  status: ConflictStatus;
  weekend: string;
}
export interface WeekendAssessment {
  weekend: string;
  status: "blocked" | "check" | "clear";  // worst of its shows, org-aware
  shows: AssessedShow[];
  beyondCapCount: number;        // shows > 1500 km
  noLocationCount: number;
}
export function assessCandidate(
  candidate: Candidate,
  shows: Show[],
  roadKmByShowId: Record<number, number | undefined>, // filled in by caller as OSRM answers arrive
): WeekendAssessment[];
```

Test coverage required: weekendKey edge cases (Fri/Sat/Sun/Mon starts, year
boundary); FIFe day-overlap vs weekend distinction; the haversine-≥400-never-
conflicts shortcut; status upgrade potential→hard/clear as roadKm arrives;
approximate never becomes hard; org=other yields only `competition`; cap and
no-location counters.

### WP2 — Scatter component — **Sonnet**

New `src/components/OrganizerScatter.tsx` (+ SSR-testable markup test like
`show-list.test.tsx`, using `renderToStaticMarkup`). Hand-rolled SVG — do NOT
add a chart library. Props: `assessments: WeekendAssessment[]`,
`candidate`, `selectedWeekend`, `onSelectWeekend`. Renders: x = weekends,
y = 0–1500 km; dots (org colour, hollow when show.geo_precision ≠ venue);
rule lines at 400/805 per candidate.org; "+N" overflow labels; weekend columns
clickable + keyboard accessible; selected column highlighted; window shading.

### WP3 — Organizer map — **Sonnet**

Extract `circlePolygon` from `ShowMap.tsx` into `src/lib/map-geo.ts` (update
ShowMap import — this is the ONE allowed touch outside new files). New
`src/components/OrganizerMap.tsx`: MapLibre map with existing show markers
(reuse marker styling conventions), a draggable candidate pin
(`onCandidateMove(lat,lng)`), and radius layers: default circle around pin
(radius per candidate.org, none for "other"); when `selectedWeekend` given,
circles around that weekend's rule-relevant shows instead. Keep the
[experiment] flag as a code comment so future readers know this UX is
unvalidated.

### WP4 — Page assembly, state, weekend detail — **Sonnet**

Rewrite `src/app/organizer/page.tsx` (replace stub): candidate state from URL
params with localStorage fallback and default (Copenhagen-ish pin, next year
Sep 1–Oct 15, org FIFe); `useShows` for the window (± 1 weekend margin);
`useRoutes` to fetch road distances ONLY for FIFe-potential shows (haversine
< 400, exact-day overlap) — never batch-OSRM everything; weekend detail panel
(chips: club, city/country, road km when known, status pill, source links);
wire scatter/map/detail selection together. Keep `DataFreshness` + `PersonaNav`
highlighting. A footnote states: TICA same-region clause not modelled; FIFe
protection requires postal code (we don't parse those yet) so treat all
plotted shows as protected.

### WP5 — Integration pass + docs — **Sonnet** (after WP1–4 merge)

Verify the three persona routes per CLAUDE.md; run full suite + `next build`;
update `ROADMAP.md` (organizer epic → done/experiment notes), `CHANGELOG.md`,
and add any discovered external-system facts to `WORLD-KNOWLEDGE.md`. File
follow-up issues for: postal-code parsing (protection status), TICA regions,
map-inversion UX feedback.

## Sequencing

WP1 first (or in parallel — its signatures above are the contract). WP2/WP3/WP4
can run in parallel with disjoint files; WP4 stubs against WP1's types. WP5
last, single agent. If running agents in one worktree, only WP5 may run
`npm run build`.

## Deliberately out of scope

- TICA "same region" logic (no region data), FIFe postal-code protection
  parsing, applying/booking workflows, auth, persistence beyond URL params,
  isodistance (road-accurate) polygons — circles + per-show OSRM checks only.

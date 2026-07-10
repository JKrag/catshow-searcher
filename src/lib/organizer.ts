import { haversineKm } from "./haversine";
import type { Show } from "./types";

// --- Types ---

export type CandidateOrg = "FIFe" | "TICA" | "other";

export interface Candidate {
  lat: number;
  lng: number;
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  org: CandidateOrg;
}

// FIFe collision severities; TICA conflict markers; never "hard" regardless of
// road distance.
export type ConflictStatus =
  | "hard" // FIFe same-day, road-verified < 400 km
  | "potential" // FIFe haversine < 400 km, road distance unknown
  | "permission" // TICA same weekend < 805 km straight-line
  | "approximate"; // FIFe/TICA would conflict but location is city/country-level

// A single show's assessment: conflict statuses + FIFe no-conflict ("clear") or
// soft competition ("competition").
export type ShowStatus = ConflictStatus | "clear" | "competition";

export type CompetitionStatus = "competition"; // everything else visible (soft)

// Saturday (ISO date) of the show's weekend. Fri/Sat/Sun map to that
// Saturday (Fri → same Sat, Sun → previous Sat); Mon–Thu map to the next
// Saturday.
export function weekendKey(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDay(); // Sun=0, Mon=1, …, Fri=5, Sat=6
  if (day === 6) return date; // already Saturday
  if (day === 0) { // Sunday → previous day = Saturday
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  // Mon(1)…Fri(5): go forward to next Saturday.
  // Offset = (6 - day): Mon=5, Tue=4, Wed=3, Thu=2, Fri=1
  d.setUTCDate(d.getUTCDate() + (6 - day));
  return d.toISOString().slice(0, 10);
}

// All weekend keys covered by [from, to].
export function weekendsInWindow(from: string, to: string): string[] {
  const startSat = weekendKey(from);
  const endSat = weekendKey(to);
  if (startSat > endSat) return [];
  if (startSat === endSat) return [startSat];
  const weekends: string[] = [startSat];
  let current = new Date(startSat + "T00:00:00Z");
  while (true) {
    current.setUTCDate(current.getUTCDate() + 7);
    const next = current.toISOString().slice(0, 10);
    weekends.push(next);
    if (next === endSat) break;
  }
  return weekends;
}

export interface AssessedShow {
  show: Show; // original, distance_km computed by caller via haversine
  status: ShowStatus;
  weekend: string; // ISO Saturday of the show's weekend
  distance_km?: number | null; // straight-line km from candidate pin, computed below in assessCandidate
}

export type WeekendStatus = "blocked" | "check" | "clear";

export interface WeekendAssessment {
  weekend: string; // ISO Saturday
  status: WeekendStatus; // worst-of show statuses, org-aware
  shows: AssessedShow[];
  beyondCapCount: number; // shows > 1500 km
  noLocationCount: number; // shows that have no coordinates at all
}

// --- Helpers ---

/** Find which candidate weekend contains `day`. */
function findCandidateWeekendForDay(day: string, cWeekends: string[]): string | null {
  for (const wk of cWeekends) {
    // candidate weekend covers Sat..Sun (Sat + 1 day)
    const sun = new Date(wk + "T00:00:00Z");
    sun.setUTCDate(sun.getUTCDate() + 1);
    const sunStr = sun.toISOString().slice(0, 10);
    if (day >= wk && day <= sunStr) return wk;
  }
  return null;
}

/** Check if the candidate window overlaps this FIFe show's date range. */
function fifeSameDayOverlap(candidateFrom: string, candidateTo: string, showStart: string, showEnd: string): boolean {
  // FIFe rule: exact-day collision. Ranges intersect if showStart <= candidateTo
  // and showEnd >= candidateFrom.
  return showStart <= candidateTo && showEnd >= candidateFrom;
}

/** Check if the candidate weekend range overlaps a TICA show's weekend (Sat-Sun). */
function candidateWeekendsOverlapTica(
  cFirstSat: string,
  cLastSat: string,
  showStartSat: string,
  showEndSun: string
): boolean {
  return showStartSat <= cLastSat && showEndSun >= cFirstSat;
}

/** Classify a single FIFe show against the candidate. */
function classifyFife(
  show: Show,
  candidateLat: number,
  candidateLng: number,
  candidateFrom: string,
  candidateTo: string,
  cWeekends: string[],
  roadKmByShowId: Record<string, number | undefined>
): { status: ShowStatus; weekend: string } | null {
  if (!fifeSameDayOverlap(candidateFrom, candidateTo, show.start_date, show.end_date)) {
    return null; // no same-day overlap → not a FIFe collision
  }

  const haversine =
    show.lat != null && show.lng != null
      ? haversineKm(candidateLat, candidateLng, show.lat, show.lng)
      : null;

  // FIFe: exact-day rule, haversine ≥ 400 → clear (road ≥ straight line,
  // so no road distance can be < 400 if straight line is ≥ 400).
  if (haversine === null || haversine >= 400) {
    const wk = findCandidateWeekendForDay(show.start_date, cWeekends);
    return { status: "clear", weekend: wk ?? cWeekends[0] };
  }

  // haversine < 400 → need road distance to distinguish potential/clear
  if (show.geo_precision === "city" || show.geo_precision === "country") {
    const wk = findCandidateWeekendForDay(show.start_date, cWeekends);
    return { status: "approximate", weekend: wk ?? cWeekends[0] };
  }

  const roadKm = show.id != null ? roadKmByShowId[String(show.id)] : undefined;
  const wk = findCandidateWeekendForDay(show.start_date, cWeekends);
  if (roadKm === undefined) {
    return { status: "potential", weekend: wk ?? cWeekends[0] };
  }
  return { status: roadKm < 400 ? "hard" : "clear", weekend: wk ?? cWeekends[0] };
}

/** Classify a single TICA show against the candidate. */
function classifyTica(
  show: Show,
  candidateLat: number,
  candidateLng: number,
  cFirstSat: string,
  cLastSat: string,
  _candidateFrom: string,
  _candidateTo: string,
  cWeekends: string[]
): { status: ShowStatus; weekend: string } | null {
  const haversine =
    show.lat != null && show.lng != null
      ? haversineKm(candidateLat, candidateLng, show.lat, show.lng)
      : null;

  // TICA weekend check: does this TICA show overlap with any weekend in the candidate range?
  // A TICA show starts on its Saturday (derived from start_date) and ends on Sunday.
  const showStartSat = weekendKey(show.start_date);
  // End of the show's weekend: Saturday + 1 day = Sunday
  const endWeekendSat = new Date(showStartSat + "T00:00:00Z");
  endWeekendSat.setUTCDate(endWeekendSat.getUTCDate() + 1);
  const showEndSun = endWeekendSat.toISOString().slice(0, 10);

  if (!candidateWeekendsOverlapTica(cFirstSat, cLastSat, showStartSat, showEndSun)) {
    return null; // no TICA weekend overlap
  }

  const status: ConflictStatus | CompetitionStatus =
    haversine !== null && haversine < 805 && show.geo_precision === "venue"
      ? "permission"
      : haversine !== null && haversine < 805
        ? "approximate"
        : "competition";

  // TICA show belongs to the candidate weekend that contains its starting Saturday
  const wk = findCandidateWeekendForDay(showStartSat, cWeekends);
  return { status, weekend: wk ?? cWeekends[0] };
}

/** Classify a single show (FIFe or TICA) against the candidate. */
function classifyShow(
  show: Show,
  candidate: Candidate,
  cFirstSat: string,
  cLastSat: string,
  cWeekends: string[],
  roadKmByShowId: Record<string, number | undefined>
): AssessedShow | null {
  // Always check against the candidate window.
  const isOverlapping = () => {
    if (show.start_date > candidate.to) return false; // starts after window → not overlapping
    if (show.end_date < candidate.from) return false; // ends before window → not overlapping
    if (show.start_date < candidate.from) return false; // starts before window
    return true; // ends on/after window start, starts on/after window start
  };

  if (!isOverlapping()) return null; // show's date range doesn't intersect candidate window

  // Rule conflicts only apply between a candidate and shows of its OWN org.
  // Cross-org shows (and everything when candidate.org === "other") are
  // never rule conflicts — only soft competition.
  if (show.source === "FIFe") {
    if (candidate.org !== "FIFe") {
      const wk = findCandidateWeekendForDay(show.start_date, cWeekends);
      return { show, status: "competition", weekend: wk ?? cWeekends[0] };
    }
    const result = classifyFife(
      show, candidate.lat, candidate.lng, candidate.from, candidate.to,
      cWeekends, roadKmByShowId
    );
    if (!result) return null;
    return { show, ...result };
  }

  // TICA (classifyTica already assigns the candidate weekend)
  if (candidate.org !== "TICA") {
    const showStartSat = weekendKey(show.start_date);
    const wk = findCandidateWeekendForDay(showStartSat, cWeekends);
    return { show, status: "competition", weekend: wk ?? cWeekends[0] };
  }
  const result = classifyTica(
    show, candidate.lat, candidate.lng, cFirstSat, cLastSat,
    candidate.from, candidate.to, cWeekends
  );
  if (!result) return null;
  return { show, ...result };
}

// --- Main API ---

/**
 * Assess all candidate days against the full show set. Returns one assessment per
 * weekend (Saturday) in the candidate window, each containing the shows that fall
 * under that weekend, a worst-case WeekendStatus and cap/noLocation counters.
 *
 * Callers should precompute `roadKmByShowId` from OSRM responses (only shows that
 * could be FIFe-hard conflicts need OSRM — haversine < 400 km shortcut avoids
 * unnecessary calls).
 */
export function assessCandidate(
  candidate: Candidate,
  shows: Show[],
  roadKmByShowId: Record<string, number | undefined>
): WeekendAssessment[] {
  const weekends = weekendsInWindow(candidate.from, candidate.to);
  if (weekends.length === 0) return [];

  const cFirstSat = weekends[0];
  const cLastSat = weekends[weekends.length - 1];

  // Classify every show and bucket by weekend
  const byWeekend = new Map<string, AssessedShow[]>();
  for (const show of shows) {
    const a = classifyShow(show, candidate, cFirstSat, cLastSat, weekends, roadKmByShowId);
    if (!a) continue;
    const bucket = byWeekend.get(a.weekend) ?? [];
    bucket.push(a);
    byWeekend.set(a.weekend, bucket);
  }

  const out: WeekendAssessment[] = [];
  for (const wk of weekends) {
    const bucket = byWeekend.get(wk);
    if (!bucket || bucket.length === 0) continue;

    // Compute distance from pin for sorting (caller may want to use it in UI)
    const withDistance = bucket.map((a) => {
      const dist =
        a.show.lat != null && a.show.lng != null
          ? haversineKm(candidate.lat, candidate.lng, a.show.lat, a.show.lng)
          : null;
      return { ...a, distance_km: dist };
    });

    // Cap at 1500 km for display; shows beyond contribute to beyondCapCount
    const cap = 1500;
    let beyondCapCount = 0;
    const inCap: AssessedShow[] = [];
    let noLocationCount = 0;

    for (const a of withDistance) {
      if (a.show.lat == null || a.show.lng == null) {
        noLocationCount++;
        continue; // never counted in cap or visual range
      }
      if (a.distance_km! > cap) {
        beyondCapCount++;
        continue;
      }
      inCap.push(a);
    }

    // Sort by distance for scatter ordering (nearest first), nulls last
    inCap.sort((a, b) => {
      const da = a.distance_km ?? Infinity;
      const db = b.distance_km ?? Infinity;
      return da - db;
    });

    // Worst-of show statuses → WeekendStatus
    const status = weekendStatus(bucket.map((a) => a.status));

    out.push({
      weekend: wk,
      status,
      shows: inCap,
      beyondCapCount,
      noLocationCount,
    });
  }

  return out;
}

/**
 * Determine the weekend's overall WeekendStatus from its shows' statuses.
 * - "blocked" = any show is hard (FIFe same-day, < 400 km road)
 * - "check" = any show is potential / permission / approximate
 * - "clear" = all shows are clear or competition
 */
function weekendStatus(showStatuses: ShowStatus[]): WeekendStatus {
  if (showStatuses.includes("hard")) return "blocked";
  if (
    showStatuses.some(
      (s) => s === "potential" || s === "permission" || s === "approximate"
    )
  ) {
    return "check";
  }
  return "clear";
}

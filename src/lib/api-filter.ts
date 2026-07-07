/**
 * Resolves the effective `from` date for the /api/shows filter.
 *
 * Semantics (applied in priority order):
 *  1. Explicit `from` param → always wins, regardless of `include_past`.
 *  2. `include_past=1` (with no explicit `from`) → return undefined (no date floor).
 *  3. Default → today's date (UTC, YYYY-MM-DD).
 *
 * "Future shows by default" uses end_date comparison (end_date >= from) in listShows,
 * so a show that started before today but ends today-or-later remains visible.
 *
 * The server uses the UTC date because the client timezone is unknown at the API level;
 * users who need a specific cutoff can use the explicit date picker.
 *
 * `today` is an injected parameter so the function is pure and testable.
 */
export function resolveFromFilter(
  sp: URLSearchParams,
  today: string = new Date().toISOString().slice(0, 10),
): string | undefined {
  const from = sp.get("from");
  if (from) return from; // explicit from always wins

  const includePast = sp.get("include_past");
  if (includePast === "1") return undefined; // show all historical shows

  // Default: hide shows that have already ended
  return today;
}

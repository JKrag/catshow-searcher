import type { Show } from "./types";

const GENERIC_PREFIX = "International show";

/**
 * Returns a display title for a show, applying a presentation-layer fallback
 * for ICS `SUMMARY` fields that are generic placeholders (e.g. "International
 * show" from FIFe).
 *
 * When the raw title starts with the generic prefix (case-insensitive),
 * returns `City (Country)` instead, plus the club name if available.
 * All other titles pass through unchanged.
 */
export function displayTitle(show: Show): string {
  const title = show.title;
  if (!title.toLowerCase().startsWith(GENERIC_PREFIX.toLowerCase())) return title;

  const club = show.club;
  const city = show.city ?? "";
  const country = show.country ?? "";

  let base = "";
  if (city && country) {
    base = `${city} (${country})`;
  } else if (city) {
    base = city;
  } else if (country) {
    base = country;
  }

  if (club && club !== title && club !== "") {
    base += ` | ${club}`;
  }
  return base;
}

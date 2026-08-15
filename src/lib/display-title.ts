import type { Show } from "./types";

const GENERIC_PREFIX = "International show";

/**
 * Returns a display title for a show, applying a presentation-layer fallback
 * for ICS `SUMMARY` fields that are generic placeholders (e.g. "International
 * show" from FIFe).
 *
 * Only FIFe shows are eligible for the fallback — the generic-placeholder
 * problem is specific to FIFe's ICS feed. When the raw title starts with the
 * generic prefix (case-insensitive), returns `City (Country)` instead, plus
 * the club name if available. Falls back to the raw title if no location
 * fields are present (never returns an empty string). All other titles pass
 * through unchanged.
 */
export function displayTitle(show: Show): string {
  const title = show.title;
  if (show.source !== "FIFe" || !title.toLowerCase().startsWith(GENERIC_PREFIX.toLowerCase())) {
    return title;
  }

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
  } else {
    base = title;
  }

  if (club && club !== title && club !== "") {
    base += ` | ${club}`;
  }
  return base;
}

import type { GeoPrecision } from "./types";

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export interface GeocodeCandidate {
  query: string;
  precision: GeoPrecision;
}

// Ordered fallback chain for geocoding a show: full venue address first, then
// city + country, then country alone. Nominatim can't parse many venue strings
// (~30% of FIFe venues) — a city-level match beats silently missing from the map.
// Duplicate queries are dropped (venue is often exactly "city, country").
export function buildGeocodeCandidates(show: {
  venue: string | null;
  city: string | null;
  country: string | null;
}): GeocodeCandidate[] {
  const candidates: GeocodeCandidate[] = [];
  const seen = new Set<string>();
  const push = (query: string | null, precision: GeoPrecision) => {
    const q = query?.trim();
    if (!q || seen.has(q.toLowerCase())) return;
    seen.add(q.toLowerCase());
    candidates.push({ query: q, precision });
  };
  push(show.venue, "venue");
  if (show.city) {
    push([show.city, show.country].filter(Boolean).join(", "), "city");
  }
  push(show.country, "country");
  return candidates;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA =
  process.env.CATZ_USER_AGENT ??
  "catz/0.1 (https://github.com/zak/catz; cat-show finder)";

let nextCallAt = 0;
async function rateLimit() {
  const now = Date.now();
  const slot = Math.max(now, nextCallAt);
  nextCallAt = slot + 1100;
  const wait = slot - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export async function geocode(
  query: string,
  cache?: Record<string, GeocodeResult | null>,
): Promise<GeocodeResult | null> {
  if (cache && Object.prototype.hasOwnProperty.call(cache, query)) {
    return cache[query];
  }

  await rateLimit();
  const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const hit = data[0];
  const result: GeocodeResult | null = hit
    ? { lat: Number(hit.lat), lng: Number(hit.lon), display_name: hit.display_name }
    : null;

  if (cache !== undefined) {
    cache[query] = result;
  }

  return result;
}

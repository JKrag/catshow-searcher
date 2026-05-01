import { getDb } from "./db";

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA =
  process.env.CATZ_USER_AGENT ??
  "catz/0.1 (https://github.com/zak/catz; cat-show finder)";

let lastCallAt = 0;
async function rateLimit() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastCallAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

export async function geocode(
  query: string,
): Promise<GeocodeResult | null> {
  const db = getDb();
  const cached = db
    .prepare(
      "SELECT lat, lng, display_name FROM geocode_cache WHERE query = ?",
    )
    .get(query) as GeocodeResult | undefined;
  if (cached) {
    if (cached.lat == null || cached.lng == null) return null;
    return cached;
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
    ? {
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        display_name: hit.display_name,
      }
    : null;

  db.prepare(
    `INSERT OR REPLACE INTO geocode_cache (query, lat, lng, display_name, fetched_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  ).run(
    query,
    result?.lat ?? null,
    result?.lng ?? null,
    result?.display_name ?? null,
  );
  return result;
}

import { getSql, ensureMigrated } from "./db";

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
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

export async function geocode(query: string): Promise<GeocodeResult | null> {
  await ensureMigrated();
  const sql = getSql();
  const cached = (await sql`
    SELECT lat, lng, display_name FROM geocode_cache WHERE query = ${query}
  `) as GeocodeResult[];
  if (cached.length) {
    const row = cached[0];
    if (row.lat == null || row.lng == null) return null;
    return row;
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

  await sql`
    INSERT INTO geocode_cache (query, lat, lng, display_name, fetched_at)
    VALUES (${query}, ${result?.lat ?? null}, ${result?.lng ?? null}, ${result?.display_name ?? null}, NOW())
    ON CONFLICT (query) DO UPDATE SET
      lat          = EXCLUDED.lat,
      lng          = EXCLUDED.lng,
      display_name = EXCLUDED.display_name,
      fetched_at   = NOW()
  `;
  return result;
}

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

export async function geocode(
  query: string,
  cache?: Record<string, GeocodeResult | null>,
): Promise<GeocodeResult | null> {
  if (cache && query in cache) {
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

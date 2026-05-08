export interface RouteResult {
  distance_m: number;
  duration_s: number;
}

const OSRM_BASE =
  process.env.CATZ_OSRM_BASE ?? "https://router.project-osrm.org";

let lastCallAt = 0;
async function rateLimit() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastCallAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

const r5 = (n: number) => Math.round(n * 1e5) / 1e5;
const routeCache = new Map<string, RouteResult | null>();

function cacheKey(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
): string {
  return `${r5(oLat)},${r5(oLng)},${r5(dLat)},${r5(dLng)}`;
}

export async function getRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<RouteResult | null> {
  const key = cacheKey(origin.lat, origin.lng, dest.lat, dest.lng);
  if (routeCache.has(key)) return routeCache.get(key)!;

  await rateLimit();
  const oLng = r5(origin.lng),
    oLat = r5(origin.lat),
    dLng = r5(dest.lng),
    dLat = r5(dest.lat);
  const url = `${OSRM_BASE}/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=false`;
  const res = await fetch(url, { headers: { "User-Agent": "catz/0.1" } });
  let result: RouteResult | null = null;
  if (res.ok) {
    const data = (await res.json()) as {
      code: string;
      routes?: { distance: number; duration: number }[];
    };
    if (data.code === "Ok" && data.routes?.[0]) {
      result = {
        distance_m: data.routes[0].distance,
        duration_s: data.routes[0].duration,
      };
    }
  }
  routeCache.set(key, result);
  return result;
}

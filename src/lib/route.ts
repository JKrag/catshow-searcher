import { getSql, ensureMigrated } from "./db";

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

export async function getRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<RouteResult | null> {
  await ensureMigrated();
  const sql = getSql();
  const oLat = r5(origin.lat),
    oLng = r5(origin.lng),
    dLat = r5(dest.lat),
    dLng = r5(dest.lng);

  const cached = (await sql`
    SELECT distance_m, duration_s FROM route_cache
    WHERE origin_lat = ${oLat} AND origin_lng = ${oLng}
      AND dest_lat   = ${dLat} AND dest_lng   = ${dLng}
  `) as RouteResult[];
  if (cached.length) {
    const row = cached[0];
    if (row.distance_m == null) return null;
    return row;
  }

  await rateLimit();
  const url = `${OSRM_BASE}/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "catz/0.1" },
  });
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
  await sql`
    INSERT INTO route_cache
      (origin_lat, origin_lng, dest_lat, dest_lng, distance_m, duration_s, fetched_at)
    VALUES (${oLat}, ${oLng}, ${dLat}, ${dLng}, ${result?.distance_m ?? null}, ${result?.duration_s ?? null}, NOW())
    ON CONFLICT (origin_lat, origin_lng, dest_lat, dest_lng) DO UPDATE SET
      distance_m = EXCLUDED.distance_m,
      duration_s = EXCLUDED.duration_s,
      fetched_at = NOW()
  `;
  return result;
}

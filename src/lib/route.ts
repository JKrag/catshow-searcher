import { getDb } from "./db";

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
  const db = getDb();
  const oLat = r5(origin.lat),
    oLng = r5(origin.lng),
    dLat = r5(dest.lat),
    dLng = r5(dest.lng);

  const cached = db
    .prepare(
      `SELECT distance_m, duration_s FROM route_cache
       WHERE origin_lat = ? AND origin_lng = ? AND dest_lat = ? AND dest_lng = ?`,
    )
    .get(oLat, oLng, dLat, dLng) as RouteResult | undefined;
  if (cached) {
    if (cached.distance_m == null) return null;
    return cached;
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
  db.prepare(
    `INSERT OR REPLACE INTO route_cache
     (origin_lat, origin_lng, dest_lat, dest_lng, distance_m, duration_s, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).run(
    oLat,
    oLng,
    dLat,
    dLng,
    result?.distance_m ?? null,
    result?.duration_s ?? null,
  );
  return result;
}

import { getSql, ensureMigrated } from "./db";
import type { NormalisedShow, Show, ShowFilter } from "./types";

export async function upsertShows(rows: NormalisedShow[]): Promise<{
  inserted: number;
  updated: number;
}> {
  await ensureMigrated();
  const sql = getSql();
  let inserted = 0;
  let updated = 0;
  await sql.begin(async (tx) => {
    for (const r of rows) {
      const result = await tx`
        INSERT INTO shows (source, source_id, title, club, country, city, venue,
                           start_date, end_date, url, raw_json, scraped_at)
        VALUES (
          ${r.source}, ${r.source_id}, ${r.title}, ${r.club ?? null},
          ${r.country ?? null}, ${r.city ?? null}, ${r.venue ?? null},
          ${r.start_date}, ${r.end_date}, ${r.url ?? null},
          ${r.raw ? JSON.stringify(r.raw) : null}, NOW()
        )
        ON CONFLICT (source, source_id) DO UPDATE SET
          title      = EXCLUDED.title,
          club       = EXCLUDED.club,
          country    = EXCLUDED.country,
          city       = EXCLUDED.city,
          venue      = EXCLUDED.venue,
          start_date = EXCLUDED.start_date,
          end_date   = EXCLUDED.end_date,
          url        = EXCLUDED.url,
          raw_json   = EXCLUDED.raw_json,
          scraped_at = NOW()
        RETURNING (xmax = 0) AS was_inserted
      `;
      if (result[0].was_inserted) inserted++;
      else updated++;
    }
  });
  return { inserted, updated };
}

export async function setShowGeocode(
  id: number,
  lat: number,
  lng: number,
): Promise<void> {
  await ensureMigrated();
  await getSql()`UPDATE shows SET lat = ${lat}, lng = ${lng} WHERE id = ${id}`;
}

export async function listShows(filter: ShowFilter = {}): Promise<Show[]> {
  await ensureMigrated();
  const sql = getSql();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (filter.org?.length) {
    const placeholders = filter.org.map(() => `$${paramIdx++}`).join(", ");
    conditions.push(`source IN (${placeholders})`);
    values.push(...filter.org);
  }
  if (filter.country?.length) {
    const placeholders = filter.country.map(() => `$${paramIdx++}`).join(", ");
    conditions.push(`country IN (${placeholders})`);
    values.push(...filter.country);
  }
  if (filter.from) {
    conditions.push(`end_date >= $${paramIdx++}`);
    values.push(filter.from);
  }
  if (filter.to) {
    conditions.push(`start_date <= $${paramIdx++}`);
    values.push(filter.to);
  }
  if (filter.q) {
    conditions.push(
      `(title ILIKE $${paramIdx} OR club ILIKE $${paramIdx} OR city ILIKE $${paramIdx} OR venue ILIKE $${paramIdx})`,
    );
    paramIdx++;
    values.push(`%${filter.q}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT * FROM shows ${where} ORDER BY start_date ASC`;
  const rows = (await sql.unsafe(query, values as string[])) as Show[];

  if (filter.near) {
    const { lat, lng, radius_km } = filter.near;
    return rows.filter((r) => {
      if (r.lat == null || r.lng == null) return false;
      return haversineKm(lat, lng, r.lat, r.lng) <= radius_km;
    });
  }
  return rows;
}

export async function listShowsMissingGeocode(limit = 50): Promise<Show[]> {
  await ensureMigrated();
  return getSql()`
    SELECT * FROM shows
    WHERE lat IS NULL OR lng IS NULL
    ORDER BY start_date ASC
    LIMIT ${limit}
  ` as Promise<Show[]>;
}

export async function distinctCountries(): Promise<string[]> {
  await ensureMigrated();
  const rows = (await getSql()`
    SELECT DISTINCT country FROM shows
    WHERE country IS NOT NULL
    ORDER BY country
  `) as { country: string }[];
  return rows.map((r) => r.country);
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

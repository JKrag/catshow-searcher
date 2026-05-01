import { getDb } from "./db";
import type { NormalisedShow, Show, ShowFilter } from "./types";

export function upsertShows(rows: NormalisedShow[]): {
  inserted: number;
  updated: number;
} {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO shows (source, source_id, title, club, country, city, venue,
                       start_date, end_date, url, raw_json, scraped_at)
    VALUES (@source, @source_id, @title, @club, @country, @city, @venue,
            @start_date, @end_date, @url, @raw_json, datetime('now'))
    ON CONFLICT(source, source_id) DO UPDATE SET
      title = excluded.title,
      club = excluded.club,
      country = excluded.country,
      city = excluded.city,
      venue = excluded.venue,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      url = excluded.url,
      raw_json = excluded.raw_json,
      scraped_at = datetime('now')
  `);
  const findStmt = db.prepare(
    "SELECT id FROM shows WHERE source = ? AND source_id = ?",
  );
  let inserted = 0;
  let updated = 0;
  const tx = db.transaction((items: NormalisedShow[]) => {
    for (const r of items) {
      const existing = findStmt.get(r.source, r.source_id);
      stmt.run({
        source: r.source,
        source_id: r.source_id,
        title: r.title,
        club: r.club ?? null,
        country: r.country ?? null,
        city: r.city ?? null,
        venue: r.venue ?? null,
        start_date: r.start_date,
        end_date: r.end_date,
        url: r.url ?? null,
        raw_json: r.raw ? JSON.stringify(r.raw) : null,
      });
      if (existing) updated++;
      else inserted++;
    }
  });
  tx(rows);
  return { inserted, updated };
}

export function setShowGeocode(id: number, lat: number, lng: number) {
  getDb()
    .prepare("UPDATE shows SET lat = ?, lng = ? WHERE id = ?")
    .run(lat, lng, id);
}

export function listShows(filter: ShowFilter = {}): Show[] {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.org?.length) {
    where.push(
      `source IN (${filter.org.map((_, i) => `@org${i}`).join(",")})`,
    );
    filter.org.forEach((o, i) => (params[`org${i}`] = o));
  }
  if (filter.country?.length) {
    where.push(
      `country IN (${filter.country.map((_, i) => `@c${i}`).join(",")})`,
    );
    filter.country.forEach((c, i) => (params[`c${i}`] = c));
  }
  if (filter.from) {
    where.push("end_date >= @from");
    params.from = filter.from;
  }
  if (filter.to) {
    where.push("start_date <= @to");
    params.to = filter.to;
  }
  if (filter.q) {
    where.push(
      "(title LIKE @q OR club LIKE @q OR city LIKE @q OR venue LIKE @q)",
    );
    params.q = `%${filter.q}%`;
  }

  const sql = `SELECT * FROM shows ${
    where.length ? "WHERE " + where.join(" AND ") : ""
  } ORDER BY start_date ASC`;
  const rows = db.prepare(sql).all(params) as Show[];

  if (filter.near) {
    const { lat, lng, radius_km } = filter.near;
    return rows.filter((r) => {
      if (r.lat == null || r.lng == null) return false;
      return haversineKm(lat, lng, r.lat, r.lng) <= radius_km;
    });
  }
  return rows;
}

export function listShowsMissingGeocode(limit = 50): Show[] {
  return getDb()
    .prepare(
      "SELECT * FROM shows WHERE lat IS NULL OR lng IS NULL ORDER BY start_date ASC LIMIT ?",
    )
    .all(limit) as Show[];
}

export function distinctCountries(): string[] {
  return (
    getDb()
      .prepare(
        "SELECT DISTINCT country FROM shows WHERE country IS NOT NULL ORDER BY country",
      )
      .all() as { country: string }[]
  ).map((r) => r.country);
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

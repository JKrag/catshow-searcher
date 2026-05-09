import type { CatzStore } from "./store";
import type { NormalisedShow, Show, ShowFilter } from "./types";

export function upsertShows(
  store: CatzStore,
  rows: NormalisedShow[],
): { inserted: number; updated: number } {
  let inserted = 0,
    updated = 0;
  let nextId = store.shows.reduce((max, s) => Math.max(max, s.id), 0) + 1;

  for (const r of rows) {
    const idx = store.shows.findIndex(
      (s) => s.source === r.source && s.source_id === r.source_id,
    );
    if (idx >= 0) {
      store.shows[idx] = {
        ...store.shows[idx],
        title: r.title,
        club: r.club ?? null,
        country: r.country ?? null,
        city: r.city ?? null,
        venue: r.venue ?? null,
        start_date: r.start_date,
        end_date: r.end_date,
        url: r.url ?? null,
        scraped_at: new Date().toISOString(),
      };
      updated++;
    } else {
      store.shows.push({
        id: nextId++,
        source: r.source,
        source_id: r.source_id,
        title: r.title,
        club: r.club ?? null,
        country: r.country ?? null,
        city: r.city ?? null,
        venue: r.venue ?? null,
        start_date: r.start_date,
        end_date: r.end_date,
        lat: null,
        lng: null,
        url: r.url ?? null,
        scraped_at: new Date().toISOString(),
      });
      inserted++;
    }
  }

  return { inserted, updated };
}

export function setShowGeocode(
  store: CatzStore,
  id: number,
  lat: number,
  lng: number,
) {
  const show = store.shows.find((s) => s.id === id);
  if (show) {
    show.lat = lat;
    show.lng = lng;
  }
}

export function listShows(store: CatzStore, filter: ShowFilter = {}): Show[] {
  let rows = store.shows.slice();

  if (filter.org?.length) {
    rows = rows.filter((s) => filter.org!.includes(s.source));
  }
  if (filter.country?.length) {
    rows = rows.filter(
      (s) => s.country != null && filter.country!.includes(s.country),
    );
  }
  if (filter.from) {
    rows = rows.filter((s) => s.end_date >= filter.from!);
  }
  if (filter.to) {
    rows = rows.filter((s) => s.start_date <= filter.to!);
  }
  if (filter.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.club?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.venue?.toLowerCase().includes(q),
    );
  }
  if (filter.near) {
    const { lat, lng, radius_km } = filter.near;
    rows = rows.filter((s) => {
      if (s.lat == null || s.lng == null) return false;
      return haversineKm(lat, lng, s.lat, s.lng) <= radius_km;
    });
  }

  return rows.sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function listShowsMissingGeocode(store: CatzStore, limit = 50): Show[] {
  return store.shows
    .filter((s) => s.lat == null || s.lng == null)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, limit);
}

export function distinctCountries(store: CatzStore): string[] {
  const seen = new Set<string>();
  for (const s of store.shows) {
    if (s.country) seen.add(s.country);
  }
  return [...seen].sort();
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

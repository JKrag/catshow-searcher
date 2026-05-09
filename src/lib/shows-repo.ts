import type { CatzStore } from "./store";
import type { FifeShow, NormalisedShow, Show, ShowFilter, TicaShow } from "./types";
import { normalizeCountry } from "./normalize-country";

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

    const commonFields = {
      title: r.title,
      club: r.club ?? null,
      country: normalizeCountry(r.country),
      city: r.city ?? null,
      venue: r.venue ?? null,
      start_date: r.start_date,
      end_date: r.end_date,
      url: r.url ?? null,
      scraped_at: new Date().toISOString(),
    };

    if (idx >= 0) {
      const existing = store.shows[idx];
      if (r.source === "FIFe") {
        // Preserve detail fields fetched separately — scraper output never carries them
        const ex = existing as FifeShow;
        store.shows[idx] = {
          ...ex,
          ...commonFields,
          source: "FIFe",
          show_type: ex.show_type,
          website_url: ex.website_url,
          detail_fetched: ex.detail_fetched,
        };
      } else {
        // Preserve detail fields fetched separately — scraper output never carries them
        const ex = existing as TicaShow;
        store.shows[idx] = {
          ...ex,
          ...commonFields,
          source: "TICA",
          show_format: ex.show_format,
          flyer_url: ex.flyer_url,
          detail_fetched: ex.detail_fetched,
        };
      }
      updated++;
    } else {
      if (r.source === "FIFe") {
        store.shows.push({
          id: nextId++,
          source: "FIFe",
          source_id: r.source_id,
          ...commonFields,
          lat: null,
          lng: null,
          show_type: null,
          website_url: null,
          detail_fetched: false,
        });
      } else {
        store.shows.push({
          id: nextId++,
          source: "TICA",
          source_id: r.source_id,
          ...commonFields,
          lat: null,
          lng: null,
          show_format: null,
          flyer_url: null,
          detail_fetched: false,
        });
      }
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

export function setFifeDetail(
  store: CatzStore,
  sourceId: string,
  show_type: string | null,
  website_url: string | null,
) {
  const show = store.shows.find(
    (s) => s.source === "FIFe" && s.source_id === sourceId,
  ) as FifeShow | undefined;
  if (show) {
    show.show_type = show_type;
    show.website_url = website_url;
    show.detail_fetched = true;
  }
}

export function setTicaDetail(
  store: CatzStore,
  sourceId: string,
  show_format: string | null,
  flyer_url: string | null,
) {
  const show = store.shows.find(
    (s) => s.source === "TICA" && s.source_id === sourceId,
  ) as TicaShow | undefined;
  if (show) {
    show.show_format = show_format;
    show.flyer_url = flyer_url;
    show.detail_fetched = true;
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

export function listFifeShowsMissingDetail(store: CatzStore, limit = 30): FifeShow[] {
  return store.shows
    .filter((s): s is FifeShow => s.source === "FIFe" && !(s as FifeShow).detail_fetched && s.url != null)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, limit);
}

export function listTicaShowsMissingDetail(store: CatzStore, limit = 30): TicaShow[] {
  return store.shows
    .filter((s): s is TicaShow => s.source === "TICA" && !(s as TicaShow).detail_fetched)
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

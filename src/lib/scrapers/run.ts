import { readStore, writeStore, EMPTY_STORE } from "../store";
import type { CatzStore } from "../store";
import {
  upsertShows,
  listShowsMissingGeocode,
  setShowGeocode,
} from "../shows-repo";
import { geocode } from "../geocode";
import { fetchFife } from "./fife";
import { fetchTica } from "./tica";
import type { Org, ScrapeRun } from "../types";

export interface ScrapeOutcome {
  source: Org;
  ok: boolean;
  inserted: number;
  updated: number;
  geocoded: number;
  error?: string;
}

async function runOne(
  source: Org,
  fetcher: () => Promise<Awaited<ReturnType<typeof fetchFife>>>,
  store: CatzStore,
  geocodeBudget: number,
): Promise<ScrapeOutcome> {
  const started_at = new Date().toISOString();
  try {
    const items = await fetcher();
    const { inserted, updated } = upsertShows(store, items);
    const missing = listShowsMissingGeocode(store, geocodeBudget).filter(
      (s) => s.source === source,
    );
    let geocoded = 0;
    for (const s of missing) {
      const q = s.venue ?? [s.city, s.country].filter(Boolean).join(", ");
      if (!q) continue;
      try {
        const g = await geocode(q, store.geocode_cache);
        if (g) {
          setShowGeocode(store, s.id, g.lat, g.lng);
          geocoded++;
        }
      } catch (e) {
        console.warn(`geocode failed for ${q}`, e);
      }
    }
    const run: ScrapeRun = {
      id: Date.now(),
      source,
      started_at,
      finished_at: new Date().toISOString(),
      status: "ok",
      items_seen: items.length,
      items_changed: inserted + updated,
      error: null,
    };
    store.scrape_runs = [run, ...store.scrape_runs].slice(0, 20);
    return { source, ok: true, inserted, updated, geocoded };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const run: ScrapeRun = {
      id: Date.now(),
      source,
      started_at,
      finished_at: new Date().toISOString(),
      status: "error",
      items_seen: 0,
      items_changed: 0,
      error: msg,
    };
    store.scrape_runs = [run, ...store.scrape_runs].slice(0, 20);
    return { source, ok: false, inserted: 0, updated: 0, geocoded: 0, error: msg };
  }
}

export async function runAllScrapers(
  geocodeBudget = 80,
): Promise<ScrapeOutcome[]> {
  const existing = (await readStore()) ?? { ...EMPTY_STORE };
  const store: CatzStore = {
    ...existing,
    shows: existing.shows.slice(),
    geocode_cache: { ...existing.geocode_cache },
    scrape_runs: existing.scrape_runs.slice(),
  };

  // Sequential — Nominatim is 1 req/sec; parallel runs cause 429s
  const fife = await runOne("FIFe", fetchFife, store, geocodeBudget);
  const tica = await runOne("TICA", fetchTica, store, geocodeBudget);

  store.updated_at = new Date().toISOString();
  await writeStore(store);

  return [fife, tica];
}

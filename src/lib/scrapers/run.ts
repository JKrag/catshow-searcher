import { readStore, writeStore, EMPTY_STORE } from "../store";
import type { CatzStore } from "../store";
import {
  upsertShows,
  listShowsMissingGeocode,
  listFifeShowsMissingDetail,
  listTicaShowsMissingDetail,
  setShowGeocode,
  setFifeDetail,
  setTicaDetail,
} from "../shows-repo";
import { geocode } from "../geocode";
import { fetchFife, fetchFifeDetail } from "./fife";
import { fetchTica, fetchTicaDetail } from "./tica";
import type { NormalisedShow, Org, ScrapeRun } from "../types";

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
  fetcher: () => Promise<NormalisedShow[]>,
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

async function fetchFifeDetails(
  store: CatzStore,
  budget: number,
): Promise<number> {
  const pending = listFifeShowsMissingDetail(store, budget);
  let fetched = 0;
  for (const show of pending) {
    try {
      const detail = await fetchFifeDetail(show.url!);
      setFifeDetail(store, show.source_id, detail.show_type, detail.website_url);
      fetched++;
    } catch (e) {
      console.warn(`FIFe detail fetch failed for ${show.url}:`, e);
      setFifeDetail(store, show.source_id, null, null);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (fetched > 0) console.log(`FIFe details fetched: ${fetched}`);
  return fetched;
}

async function fetchTicaDetails(
  store: CatzStore,
  budget: number,
): Promise<number> {
  const pending = listTicaShowsMissingDetail(store, budget);
  let fetched = 0;
  for (const show of pending) {
    try {
      const detail = await fetchTicaDetail(show.source_id);
      setTicaDetail(store, show.source_id, detail.show_format, detail.flyer_url, detail.judges);
      fetched++;
    } catch (e) {
      console.warn(`TICA detail fetch failed for ${show.source_id}:`, e);
      // Mark as fetched even on error to avoid infinite retry loops
      setTicaDetail(store, show.source_id, null, null, null);
    }
    // Rate limit — same courtesy as geocoding
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (fetched > 0) console.log(`TICA details fetched: ${fetched}`);
  return fetched;
}

export async function runAllScrapers(
  geocodeBudget = 80,
  ticaDetailBudget = 30,
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

  // Batch-fetch show details for shows not yet fetched (rate-limited, sequential)
  await fetchFifeDetails(store, ticaDetailBudget);
  await fetchTicaDetails(store, ticaDetailBudget);

  store.updated_at = new Date().toISOString();
  try {
    await writeStore(store);
  } catch (e) {
    console.error("writeStore failed:", e);
    // Scrape results are still valid even if persist failed; caller sees outcomes
  }

  return [fife, tica];
}

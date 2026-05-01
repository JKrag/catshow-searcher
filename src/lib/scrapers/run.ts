import { upsertShows, listShowsMissingGeocode, setShowGeocode } from "../shows-repo";
import { geocode } from "../geocode";
import { startRun, finishRun } from "../scrape-runs";
import { fetchFife } from "./fife";
import { fetchTica } from "./tica";
import type { Org } from "../types";

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
  geocodeBudget: number,
): Promise<ScrapeOutcome> {
  const runId = startRun(source);
  try {
    const items = await fetcher();
    const { inserted, updated } = upsertShows(items);
    const missing = listShowsMissingGeocode(geocodeBudget).filter(
      (s) => s.source === source,
    );
    let geocoded = 0;
    for (const s of missing) {
      const q = s.venue ?? [s.city, s.country].filter(Boolean).join(", ");
      if (!q) continue;
      try {
        const g = await geocode(q);
        if (g) {
          setShowGeocode(s.id, g.lat, g.lng);
          geocoded++;
        }
      } catch (e) {
        console.warn(`geocode failed for ${q}`, e);
      }
    }
    finishRun(runId, "ok", {
      items_seen: items.length,
      items_changed: inserted + updated,
    });
    return { source, ok: true, inserted, updated, geocoded };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    finishRun(runId, "error", { error: msg });
    return { source, ok: false, inserted: 0, updated: 0, geocoded: 0, error: msg };
  }
}

export async function runAllScrapers(
  geocodeBudget = 80,
): Promise<ScrapeOutcome[]> {
  // Sequential — Nominatim is 1 req/sec; running both in parallel splits the
  // rate-limit budget unevenly and triggers 429s.
  const fife = await runOne("FIFe", fetchFife, geocodeBudget);
  const tica = await runOne("TICA", fetchTica, geocodeBudget);
  return [fife, tica];
}

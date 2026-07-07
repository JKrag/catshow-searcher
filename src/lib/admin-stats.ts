import type { CatzStore } from "./store";
import type { ScrapeRun, Org } from "./types";

export interface OrgStats {
  source: Org;
  show_count: number;
  detail_fetched: number;
  geocoded: number;
}

export interface AdminStats {
  updated_at: string;
  orgs: OrgStats[];
  scrape_runs: ScrapeRun[];
}

/**
 * Pure derivation — no I/O. Extract status/coverage stats from a loaded store.
 * Geocode coverage is "lat != null / total".
 * Detail coverage is "detail_fetched === true / total".
 */
export function deriveStoreStats(store: CatzStore): AdminStats {
  const byOrg: Record<string, OrgStats> = {};

  for (const show of store.shows) {
    const src = show.source;
    if (!byOrg[src]) {
      byOrg[src] = { source: src, show_count: 0, detail_fetched: 0, geocoded: 0 };
    }
    byOrg[src].show_count++;
    if (show.detail_fetched) byOrg[src].detail_fetched++;
    if (show.lat !== null) byOrg[src].geocoded++;
  }

  // Stable order: FIFe first, then TICA, then anything else alphabetically
  const ORDER: Org[] = ["FIFe", "TICA"];
  const orgList = Object.values(byOrg).sort((a, b) => {
    const ai = ORDER.indexOf(a.source);
    const bi = ORDER.indexOf(b.source);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.source.localeCompare(b.source);
  });

  return {
    updated_at: store.updated_at,
    orgs: orgList,
    scrape_runs: store.scrape_runs,
  };
}

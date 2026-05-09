import type { ScrapeRun } from "./types";
import type { CatzStore } from "./store";

export type { ScrapeRun };

export function recentRuns(store: CatzStore, limit = 10): ScrapeRun[] {
  return store.scrape_runs.slice(0, limit);
}

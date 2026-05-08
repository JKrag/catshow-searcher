import { put, list } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import type { Show, ScrapeRun } from "./types";
import type { GeocodeResult } from "./geocode";

const BLOB_KEY = "catz-data.json";
// Vercel's project root is read-only; /tmp is the only writable dir without Blob
export const LOCAL_PATH = process.env.VERCEL
  ? "/tmp/catz.json"
  : path.join(process.cwd(), ".data", "catz.json");
const STORE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CatzStore {
  shows: Show[];
  geocode_cache: Record<string, GeocodeResult | null>;
  scrape_runs: ScrapeRun[];
  updated_at: string;
}

export const EMPTY_STORE: CatzStore = {
  shows: [],
  geocode_cache: {},
  scrape_runs: [],
  updated_at: new Date(0).toISOString(),
};

let _cachedStore: CatzStore | null = null;
let _refreshing = false;

export async function readStore(): Promise<CatzStore | null> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: BLOB_KEY });
      if (!blobs.length) return null;
      const res = await fetch(blobs[0].url);
      if (!res.ok) return null;
      return (await res.json()) as CatzStore;
    } catch {
      return null;
    }
  } else {
    if (!fs.existsSync(LOCAL_PATH)) return null;
    try {
      return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")) as CatzStore;
    } catch {
      return null;
    }
  }
}

export async function writeStore(store: CatzStore): Promise<void> {
  _cachedStore = store;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_KEY, JSON.stringify(store), {
      access: "public",
      addRandomSuffix: false,
    });
  } else {
    fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2));
  }
}

export function isStale(store: CatzStore): boolean {
  return Date.now() - new Date(store.updated_at).getTime() > STORE_TTL_MS;
}

export async function getOrLoadStore(): Promise<CatzStore> {
  if (_cachedStore && !isStale(_cachedStore)) return _cachedStore;

  const stored = await readStore();

  if (!stored) {
    // No data yet — return empty and let the admin trigger the first scrape
    return { ...EMPTY_STORE };
  }

  _cachedStore = stored;

  if (isStale(stored) && !_refreshing) {
    _refreshing = true;
    const doRefresh = async () => {
      try {
        const { runAllScrapers } = await import("./scrapers/run");
        await runAllScrapers();
      } catch (e) {
        console.error("background refresh failed:", e);
      } finally {
        _refreshing = false;
      }
    };
    try {
      const { waitUntil } = await import("@vercel/functions");
      waitUntil(doRefresh());
    } catch {
      void doRefresh();
    }
  }

  return stored;
}

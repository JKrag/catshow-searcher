import { put, list } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import type { Show, ScrapeRun } from "./types";
import type { GeocodeResult } from "./geocode";
import { normalizeCountry } from "./normalize-country";

const BLOB_KEY = "catz-data.json";
// Vercel's project root is read-only; /tmp is the only writable dir without Blob
export const LOCAL_PATH = process.env.VERCEL
  ? "/tmp/catz.json"
  : path.join(process.cwd(), ".data", "catz.json");
const STORE_TTL_MS = 24 * 60 * 60 * 1000;

// Vercel may name the token BLOB_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN_<STORE>
function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find((k) =>
    k.startsWith("BLOB_READ_WRITE_TOKEN_"),
  );
  return key ? process.env[key] : undefined;
}

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

// The app never scrapes — a scheduled GitHub Actions job owns all writes
// (see docs/adr/0001). Blob reads are cached briefly so a burst of requests
// doesn't re-fetch the blob on every call.
const READ_CACHE_MS = 5 * 60 * 1000;

let _cachedStore: CatzStore | null = null;
let _cachedAt = 0;

export async function readStore(): Promise<CatzStore | null> {
  const token = getBlobToken();
  if (token) {
    try {
      const { blobs } = await list({ prefix: BLOB_KEY, token });
      if (!blobs.length) return null;
      const res = await fetch(blobs[0].url);
      if (!res.ok) return null;
      return (await res.json()) as CatzStore;
    } catch (error) {
      console.error("Failed to read store from Blob storage:", error);
      return null;
    }
  } else {
    if (!fs.existsSync(LOCAL_PATH)) return null;
    try {
      return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8")) as CatzStore;
    } catch (error) {
      console.error("Failed to read store from local file:", error);
      return null;
    }
  }
}

export async function writeStore(store: CatzStore): Promise<void> {
  _cachedStore = store;
  _cachedAt = Date.now();
  const token = getBlobToken();
  if (token) {
    await put(BLOB_KEY, JSON.stringify(store), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true, // @vercel/blob v2 refuses to overwrite by default
      token,
    });
  } else {
    fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2));
  }
}

export function isStale(store: CatzStore): boolean {
  return Date.now() - new Date(store.updated_at).getTime() > STORE_TTL_MS;
}

// Applies all schema migrations in one pass. Returns true if anything changed.
// Uses Record<string, unknown> casts for org-specific fields because old blobs
// won't have those keys — TypeScript's `in` guard would narrow to `never` here.
// Persisting a migrated store is the scrape job's responsibility; the app only
// migrates in memory for serving.
export function migrateStore(store: CatzStore): boolean {
  let changed = false;
  for (const show of store.shows) {
    // Country normalization — fixes data written before normalization was deployed
    const normalized = normalizeCountry(show.country);
    if (normalized !== show.country) {
      show.country = normalized;
      changed = true;
    }
    // Org-specific fields added in #6 — backfill missing keys from old blobs
    const raw = show as unknown as Record<string, unknown>;
    // geo_precision added with the geocode fallback chain. Shows geocoded before
    // then used a single query: venue when present, else "city, country" — so the
    // stored precision can be inferred exactly.
    if (raw["geo_precision"] === undefined) {
      raw["geo_precision"] =
        show.lat == null ? null : show.venue ? "venue" : "city";
      changed = true;
    }
    if (show.source === "FIFe") {
      if (raw["show_type"] === undefined) { raw["show_type"] = null; changed = true; }
      if (raw["website_url"] === undefined) { raw["website_url"] = null; changed = true; }
      if (raw["detail_fetched"] === undefined) { raw["detail_fetched"] = false; changed = true; }
    } else if (show.source === "TICA") {
      if (raw["show_format"] === undefined) { raw["show_format"] = null; changed = true; }
      if (raw["flyer_url"] === undefined) { raw["flyer_url"] = null; changed = true; }
      if (raw["judges"] === undefined) { raw["judges"] = null; changed = true; }
      if (raw["detail_fetched"] === undefined) { raw["detail_fetched"] = false; changed = true; }
    }
  }
  return changed;
}

export async function getOrLoadStore(): Promise<CatzStore> {
  if (_cachedStore && Date.now() - _cachedAt < READ_CACHE_MS) return _cachedStore;

  const stored = await readStore();

  if (!stored) {
    // Blob read failed but we have a warm in-memory copy — prefer it over empty
    return _cachedStore ?? { ...EMPTY_STORE };
  }

  migrateStore(stored);
  _cachedStore = stored;
  _cachedAt = Date.now();
  return stored;
}

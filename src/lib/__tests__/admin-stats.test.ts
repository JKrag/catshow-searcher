import { describe, it, expect } from "vitest";
import type { CatzStore } from "../store";
import type { FifeShow, TicaShow } from "../types";
import { deriveStoreStats } from "../admin-stats";

function makeStore(shows: (FifeShow | TicaShow)[] = []): CatzStore {
  return {
    shows,
    geocode_cache: {},
    scrape_runs: [],
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeFife(overrides: Partial<FifeShow> = {}): FifeShow {
  return {
    id: 1,
    source: "FIFe",
    source_id: "fife-1",
    title: "Nordic Show",
    club: null,
    country: "Denmark",
    city: "Copenhagen",
    venue: null,
    start_date: "2026-05-09",
    end_date: "2026-05-10",
    lat: null,
    lng: null,
    url: null,
    scraped_at: "2026-01-01T00:00:00.000Z",
    show_type: null,
    website_url: null,
    detail_fetched: false,
    ...overrides,
  };
}

function makeTica(overrides: Partial<TicaShow> = {}): TicaShow {
  return {
    id: 2,
    source: "TICA",
    source_id: "tica-1",
    title: "TICA Show",
    club: null,
    country: "United States",
    city: "Houston",
    venue: null,
    start_date: "2026-06-01",
    end_date: "2026-06-02",
    lat: null,
    lng: null,
    url: null,
    scraped_at: "2026-01-01T00:00:00.000Z",
    show_format: null,
    flyer_url: null,
    judges: null,
    detail_fetched: false,
    ...overrides,
  };
}

describe("deriveStoreStats", () => {
  it("returns empty orgs array and preserves updated_at for empty store", () => {
    const store = makeStore();
    const stats = deriveStoreStats(store);
    expect(stats.updated_at).toBe("2026-01-01T00:00:00.000Z");
    expect(stats.orgs).toEqual([]);
    expect(stats.scrape_runs).toEqual([]);
  });

  it("counts shows per org", () => {
    const store = makeStore([
      makeFife({ id: 1, source_id: "f1" }),
      makeFife({ id: 2, source_id: "f2" }),
      makeTica({ id: 3, source_id: "t1" }),
    ]);
    const stats = deriveStoreStats(store);
    expect(stats.orgs).toHaveLength(2);
    const fife = stats.orgs.find((o) => o.source === "FIFe")!;
    const tica = stats.orgs.find((o) => o.source === "TICA")!;
    expect(fife.show_count).toBe(2);
    expect(tica.show_count).toBe(1);
  });

  it("counts detail_fetched correctly", () => {
    const store = makeStore([
      makeFife({ id: 1, source_id: "f1", detail_fetched: true }),
      makeFife({ id: 2, source_id: "f2", detail_fetched: false }),
      makeFife({ id: 3, source_id: "f3", detail_fetched: true }),
    ]);
    const stats = deriveStoreStats(store);
    const fife = stats.orgs[0];
    expect(fife.show_count).toBe(3);
    expect(fife.detail_fetched).toBe(2);
  });

  it("counts geocoded using lat != null (not lng)", () => {
    const store = makeStore([
      // lat set, lng set — geocoded
      makeTica({ id: 1, source_id: "t1", lat: 51.5, lng: -0.1 }),
      // lat set, lng null — still geocoded (task spec: lat != null / total)
      makeTica({ id: 2, source_id: "t2", lat: 48.8, lng: null }),
      // lat null — not geocoded
      makeTica({ id: 3, source_id: "t3", lat: null, lng: null }),
    ]);
    const stats = deriveStoreStats(store);
    const tica = stats.orgs[0];
    expect(tica.geocoded).toBe(2);
  });

  it("returns FIFe before TICA in orgs list", () => {
    const store = makeStore([
      makeTica({ id: 1, source_id: "t1" }),
      makeFife({ id: 2, source_id: "f1" }),
    ]);
    const stats = deriveStoreStats(store);
    expect(stats.orgs[0].source).toBe("FIFe");
    expect(stats.orgs[1].source).toBe("TICA");
  });

  it("passes scrape_runs through unchanged", () => {
    const runs = [
      {
        id: "run-1",
        source: "FIFe" as const,
        started_at: "2026-01-01T00:00:00.000Z",
        finished_at: "2026-01-01T00:05:00.000Z",
        status: "ok" as const,
        items_seen: 100,
        items_changed: 5,
        error: null,
      },
    ];
    const store = { ...makeStore(), scrape_runs: runs };
    const stats = deriveStoreStats(store);
    expect(stats.scrape_runs).toBe(runs); // same reference — no copy
  });

  it("handles all shows having no detail yet (0/N)", () => {
    const store = makeStore([
      makeFife({ id: 1, source_id: "f1", detail_fetched: false }),
    ]);
    const stats = deriveStoreStats(store);
    const fife = stats.orgs[0];
    expect(fife.detail_fetched).toBe(0);
    expect(fife.show_count).toBe(1);
  });

  it("handles 100% geocoded and detail_fetched", () => {
    const store = makeStore([
      makeFife({ id: 1, source_id: "f1", detail_fetched: true, lat: 55.0, lng: 12.0 }),
      makeFife({ id: 2, source_id: "f2", detail_fetched: true, lat: 48.0, lng: 11.0 }),
    ]);
    const stats = deriveStoreStats(store);
    const fife = stats.orgs[0];
    expect(fife.show_count).toBe(2);
    expect(fife.detail_fetched).toBe(2);
    expect(fife.geocoded).toBe(2);
  });
});

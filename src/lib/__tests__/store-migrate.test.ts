import { describe, it, expect } from "vitest";
import { migrateStore, EMPTY_STORE } from "../store";
import type { CatzStore } from "../store";
import type { Show } from "../types";

// Minimal show factory — cast because migrations must cope with old blobs
// that predate current schema fields.
function show(fields: Record<string, unknown>): Show {
  return {
    id: 1,
    source: "FIFe",
    source_id: "x",
    title: "t",
    club: null,
    country: "Denmark",
    city: "Odense",
    venue: null,
    start_date: "2026-08-01",
    end_date: "2026-08-01",
    lat: null,
    lng: null,
    url: null,
    scraped_at: "2026-07-08T00:00:00.000Z",
    show_type: null,
    website_url: null,
    detail_fetched: false,
    ...fields,
  } as unknown as Show;
}

function storeWith(shows: Show[]): CatzStore {
  return { ...EMPTY_STORE, shows };
}

describe("migrateStore geo_precision backfill", () => {
  it("infers 'venue' for geocoded shows that had a venue", () => {
    const s = show({ lat: 55.4, lng: 10.4, venue: "Some Hall, Odense" });
    delete (s as unknown as Record<string, unknown>)["geo_precision"];
    const store = storeWith([s]);
    expect(migrateStore(store)).toBe(true);
    expect(s.geo_precision).toBe("venue");
  });

  it("infers 'city' for geocoded shows without a venue", () => {
    const s = show({ lat: 55.4, lng: 10.4, venue: null });
    delete (s as unknown as Record<string, unknown>)["geo_precision"];
    const store = storeWith([s]);
    expect(migrateStore(store)).toBe(true);
    expect(s.geo_precision).toBe("city");
  });

  it("sets null for ungeocoded shows", () => {
    const s = show({ lat: null, lng: null });
    delete (s as unknown as Record<string, unknown>)["geo_precision"];
    migrateStore(storeWith([s]));
    expect(s.geo_precision).toBeNull();
  });

  it("leaves an existing geo_precision untouched and reports no change", () => {
    const s = show({ lat: 55.4, lng: 10.4, geo_precision: "country" });
    const store = storeWith([s]);
    expect(migrateStore(store)).toBe(false);
    expect(s.geo_precision).toBe("country");
  });
});

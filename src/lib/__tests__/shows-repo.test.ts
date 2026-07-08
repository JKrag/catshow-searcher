import { describe, it, expect, beforeEach } from "vitest";
import type { CatzStore } from "../store";
import type { FifeShow, TicaShow } from "../types";
import {
  upsertShows,
  setFifeDetail,
  setTicaDetail,
  setShowGeocode,
  listFifeShowsMissingDetail,
  listTicaShowsMissingDetail,
  listShows,
} from "../shows-repo";

function makeStore(): CatzStore {
  return {
    shows: [],
    geocode_cache: {},
    scrape_runs: [],
    updated_at: new Date(0).toISOString(),
  };
}

describe("upsertShows", () => {
  let store: CatzStore;

  beforeEach(() => {
    store = makeStore();
  });

  it("inserts a new FIFe show with detail fields initialised to null/false", () => {
    const { inserted, updated } = upsertShows(store, [
      {
        source: "FIFe",
        source_id: "fife-1",
        title: "Nordic Show",
        start_date: "2026-05-09",
        end_date: "2026-05-10",
        url: "https://fifeweb.org/event/1",
        country: "Denmark",
        city: "Copenhagen",
      },
    ]);

    expect(inserted).toBe(1);
    expect(updated).toBe(0);
    expect(store.shows).toHaveLength(1);

    const show = store.shows[0] as FifeShow;
    expect(show.source).toBe("FIFe");
    expect(show.source_id).toBe("fife-1");
    expect(show.title).toBe("Nordic Show");
    expect(show.country).toBe("Denmark");
    expect(show.show_type).toBeNull();
    expect(show.website_url).toBeNull();
    expect(show.detail_fetched).toBe(false);
    expect(show.lat).toBeNull();
    expect(show.lng).toBeNull();
    expect(show.id).toBeGreaterThanOrEqual(1);
  });

  it("inserts a new TICA show with detail fields initialised to null/false", () => {
    upsertShows(store, [
      {
        source: "TICA",
        source_id: "tica-1",
        title: "TICA Spring",
        start_date: "2026-06-01",
        end_date: "2026-06-02",
        url: "https://shows.tica.org/show/tica-1",
        country: "Germany",
        city: "Berlin",
      },
    ]);

    const show = store.shows[0] as TicaShow;
    expect(show.source).toBe("TICA");
    expect(show.show_format).toBeNull();
    expect(show.flyer_url).toBeNull();
    expect(show.detail_fetched).toBe(false);
  });

  it("normalises country on insert", () => {
    upsertShows(store, [
      {
        source: "FIFe",
        source_id: "fife-2",
        title: "Show",
        start_date: "2026-05-01",
        end_date: "2026-05-01",
        country: "Danmark",
        city: "Aarhus",
      },
    ]);

    expect(store.shows[0].country).toBe("Denmark");
  });

  it("updates common fields on re-scrape, preserving FIFe detail fields", () => {
    upsertShows(store, [
      {
        source: "FIFe",
        source_id: "fife-1",
        title: "Old Title",
        start_date: "2026-05-09",
        end_date: "2026-05-10",
        country: "Denmark",
        city: "Copenhagen",
        url: "https://fifeweb.org/event/1",
      },
    ]);

    // Simulate detail fetch
    setFifeDetail(store, "fife-1", "Two 1 day shows", "https://club.dk");

    // Re-scrape with updated title
    const { inserted, updated } = upsertShows(store, [
      {
        source: "FIFe",
        source_id: "fife-1",
        title: "Updated Title",
        start_date: "2026-05-09",
        end_date: "2026-05-10",
        country: "Denmark",
        city: "Copenhagen",
        url: "https://fifeweb.org/event/1",
      },
    ]);

    expect(inserted).toBe(0);
    expect(updated).toBe(1);
    expect(store.shows).toHaveLength(1);

    const show = store.shows[0] as FifeShow;
    expect(show.title).toBe("Updated Title");
    // Detail fields must survive the re-scrape
    expect(show.show_type).toBe("Two 1 day shows");
    expect(show.website_url).toBe("https://club.dk");
    expect(show.detail_fetched).toBe(true);
  });

  it("updates common fields on re-scrape, preserving TICA detail fields", () => {
    upsertShows(store, [
      {
        source: "TICA",
        source_id: "tica-1",
        title: "Old Title",
        start_date: "2026-06-01",
        end_date: "2026-06-02",
        country: "Germany",
        city: "Berlin",
        url: "https://shows.tica.org/show/tica-1",
      },
    ]);

    setTicaDetail(store, "tica-1", "Household Pet", "https://flyer.example.com/x.pdf", null);

    upsertShows(store, [
      {
        source: "TICA",
        source_id: "tica-1",
        title: "Updated Title",
        start_date: "2026-06-01",
        end_date: "2026-06-02",
        country: "Germany",
        city: "Berlin",
        url: "https://shows.tica.org/show/tica-1",
      },
    ]);

    const show = store.shows[0] as TicaShow;
    expect(show.title).toBe("Updated Title");
    expect(show.show_format).toBe("Household Pet");
    expect(show.flyer_url).toBe("https://flyer.example.com/x.pdf");
    expect(show.detail_fetched).toBe(true);
  });

  it("assigns auto-incrementing IDs", () => {
    upsertShows(store, [
      { source: "FIFe", source_id: "a", title: "A", start_date: "2026-05-01", end_date: "2026-05-01", country: "Denmark", city: "X" },
      { source: "TICA", source_id: "b", title: "B", start_date: "2026-05-02", end_date: "2026-05-02", country: "France", city: "Y" },
    ]);

    const ids = store.shows.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids[1]).toBe(ids[0] + 1);
  });

  it("counts inserts and updates correctly in a mixed batch", () => {
    upsertShows(store, [
      { source: "FIFe", source_id: "x", title: "X", start_date: "2026-05-01", end_date: "2026-05-01", country: "Denmark", city: "A" },
    ]);

    const result = upsertShows(store, [
      { source: "FIFe", source_id: "x", title: "X updated", start_date: "2026-05-01", end_date: "2026-05-01", country: "Denmark", city: "A" },
      { source: "TICA", source_id: "y", title: "Y new", start_date: "2026-05-02", end_date: "2026-05-02", country: "France", city: "B" },
    ]);

    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);
  });
});

describe("listShows – in-progress show visibility", () => {
  it("keeps a show that started before today but ends today-or-later (end_date >= from)", () => {
    const store = makeStore();
    // Show started yesterday, ends tomorrow — should remain visible with from=today
    upsertShows(store, [
      {
        source: "FIFe",
        source_id: "in-progress",
        title: "In-Progress Show",
        start_date: "2026-07-06", // yesterday relative to 2026-07-07
        end_date: "2026-07-08",   // tomorrow
        country: "Denmark",
        city: "Copenhagen",
      },
    ]);

    const results = listShows(store, { from: "2026-07-07" });
    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe("in-progress");
  });

  it("hides a show that ended before today", () => {
    const store = makeStore();
    upsertShows(store, [
      {
        source: "FIFe",
        source_id: "past-show",
        title: "Past Show",
        start_date: "2026-07-04",
        end_date: "2026-07-05", // ended before today (2026-07-07)
        country: "Denmark",
        city: "Copenhagen",
      },
    ]);

    const results = listShows(store, { from: "2026-07-07" });
    expect(results).toHaveLength(0);
  });
});

describe("listFifeShowsMissingDetail", () => {
  it("returns only FIFe shows with detail_fetched=false and a url", () => {
    const store = makeStore();
    upsertShows(store, [
      { source: "FIFe", source_id: "a", title: "A", start_date: "2026-05-01", end_date: "2026-05-01", country: "Denmark", city: "X", url: "https://example.com/a" },
      { source: "FIFe", source_id: "b", title: "B", start_date: "2026-05-02", end_date: "2026-05-02", country: "Denmark", city: "X", url: null },
      { source: "TICA", source_id: "c", title: "C", start_date: "2026-05-03", end_date: "2026-05-03", country: "France", city: "Y", url: "https://example.com/c" },
    ]);
    setFifeDetail(store, "a", "One day", null);

    const pending = listFifeShowsMissingDetail(store);
    expect(pending).toHaveLength(0); // "a" fetched, "b" has no url
  });

  it("returns unfetched FIFe shows that have a url", () => {
    const store = makeStore();
    upsertShows(store, [
      { source: "FIFe", source_id: "a", title: "A", start_date: "2026-05-01", end_date: "2026-05-01", country: "Denmark", city: "X", url: "https://example.com/a" },
    ]);

    const pending = listFifeShowsMissingDetail(store);
    expect(pending).toHaveLength(1);
    expect(pending[0].source_id).toBe("a");
  });
});

describe("listTicaShowsMissingDetail", () => {
  it("returns TICA shows with detail_fetched=false", () => {
    const store = makeStore();
    upsertShows(store, [
      { source: "TICA", source_id: "t1", title: "T1", start_date: "2026-05-01", end_date: "2026-05-01", country: "France", city: "Paris" },
      { source: "TICA", source_id: "t2", title: "T2", start_date: "2026-05-02", end_date: "2026-05-02", country: "Germany", city: "Berlin" },
    ]);
    setTicaDetail(store, "t1", "All Breed", null, null);

    const pending = listTicaShowsMissingDetail(store);
    expect(pending).toHaveLength(1);
    expect(pending[0].source_id).toBe("t2");
  });
});

describe("upsertShows — re-geocode on location change", () => {
  const base = {
    source: "FIFe" as const,
    source_id: "fife-move",
    title: "Moving Show",
    start_date: "2027-05-01",
    end_date: "2027-05-02",
    url: "https://fifeweb.org/event/9",
    country: "Finland",
    city: "not yet fixed",
    venue: "not yet fixed, not yet fixed, Finland",
  };

  function geocodedStore(): CatzStore {
    const store = makeStore();
    upsertShows(store, [base]);
    setShowGeocode(store, store.shows[0].id, 64.9, 26.0, "country");
    return store;
  }

  it("clears coordinates when the venue changes", () => {
    const store = geocodedStore();
    upsertShows(store, [
      { ...base, venue: "Messukeskus, Helsinki, Finland", city: "Helsinki" },
    ]);
    const show = store.shows[0];
    expect(show.lat).toBeNull();
    expect(show.lng).toBeNull();
    expect(show.geo_precision).toBeNull();
  });

  it("clears coordinates when only the city changes", () => {
    const store = geocodedStore();
    upsertShows(store, [{ ...base, city: "Helsinki" }]);
    expect(store.shows[0].lat).toBeNull();
  });

  it("clears coordinates when only the country changes", () => {
    const store = geocodedStore();
    upsertShows(store, [{ ...base, country: "Sweden" }]);
    expect(store.shows[0].lat).toBeNull();
  });

  it("keeps coordinates when the location is unchanged", () => {
    const store = geocodedStore();
    upsertShows(store, [{ ...base, title: "Renamed Show" }]);
    const show = store.shows[0];
    expect(show.lat).toBe(64.9);
    expect(show.lng).toBe(26.0);
    expect(show.geo_precision).toBe("country");
    expect(show.title).toBe("Renamed Show");
  });

  it("does not treat country normalization as a move", () => {
    const store = makeStore();
    upsertShows(store, [{ ...base, country: "Suomi" }]); // normalizes to Finland
    setShowGeocode(store, store.shows[0].id, 64.9, 26.0, "country");
    upsertShows(store, [{ ...base, country: "Suomi" }]);
    expect(store.shows[0].lat).toBe(64.9);
  });

  it("still preserves detail fields when a show moves (TICA)", () => {
    const store = makeStore();
    const tica = { ...base, source: "TICA" as const, source_id: "tica-move" };
    upsertShows(store, [tica]);
    setShowGeocode(store, store.shows[0].id, 64.9, 26.0, "city");
    setTicaDetail(store, "tica-move", "Championship", null, ["A Judge(AB)"]);
    upsertShows(store, [{ ...tica, city: "Helsinki" }]);
    const show = store.shows[0] as TicaShow;
    expect(show.lat).toBeNull();
    expect(show.show_format).toBe("Championship");
    expect(show.judges).toEqual(["A Judge(AB)"]);
  });
});

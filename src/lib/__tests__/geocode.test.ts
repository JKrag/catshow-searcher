import { describe, it, expect } from "vitest";
import { buildGeocodeCandidates } from "../geocode";

describe("buildGeocodeCandidates", () => {
  it("builds the full fallback chain: venue → city+country → country", () => {
    expect(
      buildGeocodeCandidates({
        venue: "Messehalle 3, Hannover",
        city: "Hannover",
        country: "Germany",
      }),
    ).toEqual([
      { query: "Messehalle 3, Hannover", precision: "venue" },
      { query: "Hannover, Germany", precision: "city" },
      { query: "Germany", precision: "country" },
    ]);
  });

  it("skips venue when null", () => {
    expect(
      buildGeocodeCandidates({ venue: null, city: "Odense", country: "Denmark" }),
    ).toEqual([
      { query: "Odense, Denmark", precision: "city" },
      { query: "Denmark", precision: "country" },
    ]);
  });

  it("dedupes venue that equals the city+country query (case-insensitive)", () => {
    expect(
      buildGeocodeCandidates({
        venue: "paris, france",
        city: "Paris",
        country: "France",
      }),
    ).toEqual([
      { query: "paris, france", precision: "venue" },
      { query: "France", precision: "country" },
    ]);
  });

  it("handles city without country", () => {
    expect(buildGeocodeCandidates({ venue: null, city: "Tokyo", country: null })).toEqual([
      { query: "Tokyo", precision: "city" },
    ]);
  });

  it("skips blank strings entirely", () => {
    expect(buildGeocodeCandidates({ venue: "  ", city: null, country: "" })).toEqual([]);
  });

  it("returns empty for a show with no location info", () => {
    expect(buildGeocodeCandidates({ venue: null, city: null, country: null })).toEqual([]);
  });
});

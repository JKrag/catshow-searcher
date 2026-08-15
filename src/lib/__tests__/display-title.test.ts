import { describe, it, expect } from "vitest";
import { displayTitle } from "../display-title";
import type { FifeShow, TicaShow } from "../types";

describe("displayTitle", () => {
  it("falls back to City (Country) for a generic-title FIFe show", () => {
    const show: FifeShow = {
      id: 1,
      source: "FIFe",
      source_id: "12345",
      title: "International show",
      club: "Cat Club Copenhagen",
      country: "Denmark",
      city: "Copenhagen",
      venue: null,
      start_date: "2026-05-09",
      end_date: "2026-05-10",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("Copenhagen (Denmark) | Cat Club Copenhagen");
  });

  it("falls back to City only when country is missing", () => {
    const show: FifeShow = {
      id: 2,
      source: "FIFe",
      source_id: "12346",
      title: "International show",
      club: null,
      country: null,
      city: "Berlin",
      venue: null,
      start_date: "2026-06-05",
      end_date: "2026-06-07",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("Berlin");
  });

  it("falls back to Country only when city is missing", () => {
    const show: FifeShow = {
      id: 3,
      source: "FIFe",
      source_id: "12347",
      title: "International show",
      club: "Kattklubb",
      country: "Sweden",
      city: null,
      venue: null,
      start_date: "2026-07-01",
      end_date: "2026-07-05",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("Sweden | Kattklubb");
  });

  it("does not fall back when club is null (no fallback needed)", () => {
    const show: FifeShow = {
      id: 4,
      source: "FIFe",
      source_id: "12348",
      title: "International show",
      club: null,
      country: "Norway",
      city: "Oslo",
      venue: null,
      start_date: "2026-08-01",
      end_date: "2026-08-03",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("Oslo (Norway)");
  });

  it("falls back to the raw title when no city or country is available", () => {
    const show: FifeShow = {
      id: 9,
      source: "FIFe",
      source_id: "12351",
      title: "International show",
      club: null,
      country: null,
      city: null,
      venue: null,
      start_date: "2026-08-01",
      end_date: "2026-08-03",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("International show");
  });

  it("passes through a non-generic title unchanged", () => {
    const show: FifeShow = {
      id: 5,
      source: "FIFe",
      source_id: "12349",
      title: "Annual Danish Show",
      club: null,
      country: "Denmark",
      city: "Copenhagen",
      venue: null,
      start_date: "2026-09-01",
      end_date: "2026-09-03",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("Annual Danish Show");
  });

  it("passes through a TICA show unchanged regardless of title", () => {
    const show: TicaShow = {
      id: 6,
      source: "TICA",
      source_id: "9999",
      title: "California Regional",
      club: null,
      country: "United States",
      city: "Los Angeles",
      venue: null,
      start_date: "2026-05-15",
      end_date: "2026-05-17",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_format: null,
      flyer_url: null,
      judges: null,
    };
    expect(displayTitle(show)).toBe("California Regional");
  });

  it("does not apply the fallback to a TICA show even with a generic-looking title", () => {
    const show: TicaShow = {
      id: 8,
      source: "TICA",
      source_id: "8888",
      title: "International show",
      club: "Some Club",
      country: "United States",
      city: "Los Angeles",
      venue: null,
      start_date: "2026-05-15",
      end_date: "2026-05-17",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_format: null,
      flyer_url: null,
      judges: null,
    };
    expect(displayTitle(show)).toBe("International show");
  });

  it("matches on case-insensitive generic prefix", () => {
    const show: FifeShow = {
      id: 7,
      source: "FIFe",
      source_id: "12350",
      title: "international show",
      club: "Some Club",
      country: "Denmark",
      city: "Copenhagen",
      venue: null,
      start_date: "2026-05-01",
      end_date: "2026-05-03",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("Copenhagen (Denmark) | Some Club");
  });

  it("does not fall back when title starts with the prefix but is not 'International show'", () => {
    const show: FifeShow = {
      id: 8,
      source: "FIFe",
      source_id: "12351",
      title: "International exhibit",
      club: null,
      country: "Denmark",
      city: "Copenhagen",
      venue: null,
      start_date: "2026-05-01",
      end_date: "2026-05-03",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    expect(displayTitle(show)).toBe("International exhibit");
  });

  it("falls back when the title starts with a space and then 'International show'", () => {
    const show: FifeShow = {
      id: 9,
      source: "FIFe",
      source_id: "12352",
      title: "  International show",
      club: "Cat Club",
      country: "Sweden",
      city: "Stockholm",
      venue: null,
      start_date: "2026-05-01",
      end_date: "2026-05-03",
      lat: null,
      lng: null,
      geo_precision: null,
      url: null,
      scraped_at: "2026-05-01T00:00:00Z",
      detail_fetched: false,
      show_type: null,
      website_url: null,
    };
    // The spec says "starts with 'International show'" — this title starts with spaces,
    // so the prefix check does NOT match. Returning the raw title.
    expect(displayTitle(show)).toBe("  International show");
  });
});

import { describe, it, expect } from "vitest";
import { parseTica, parseTicaDetail } from "../tica";

// Minimal realistic HTML from shows.tica.org
const SAMPLE_HTML = `
<div class="show-list">
  <div class="month-heading">May 2026</div>
  <div class="show-entry">
    <span class="date">09 - 10</span>
    <span class="address">Copenhagen, Denmark</span>
    <span class="club-name">Nordic Cats</span>
    <a rel="1234">details</a>
  </div>
  <div class="month-heading">June 2026</div>
  <div class="show-entry">
    <span class="date">30 - 01</span>
    <span class="address">Paris, France</span>
    <span class="club-name">Chat Club</span>
    <a rel="5678">details</a>
  </div>
  <div class="show-entry">
    <span class="date">15</span>
    <span class="address">Berlin, Germany</span>
    <span class="club-name">Berliner Katzen</span>
    <a rel="9999">details</a>
  </div>
</div>`;

describe("parseTica", () => {
  it("returns empty array when show-list is absent", () => {
    expect(parseTica("<html></html>")).toEqual([]);
  });

  it("parses a basic show entry", () => {
    const shows = parseTica(SAMPLE_HTML);
    const s = shows.find((x) => x.source_id === "1234")!;
    expect(s.source).toBe("TICA");
    expect(s.title).toBe("Nordic Cats");
    expect(s.club).toBe("Nordic Cats");
    expect(s.city).toBe("Copenhagen");
    expect(s.country).toBe("Denmark");
    expect(s.start_date).toBe("2026-05-09");
    expect(s.end_date).toBe("2026-05-10");
    expect(s.url).toContain("1234");
  });

  it("handles a date range that crosses a month boundary", () => {
    const shows = parseTica(SAMPLE_HTML);
    const s = shows.find((x) => x.source_id === "5678")!;
    expect(s.start_date).toBe("2026-06-30");
    expect(s.end_date).toBe("2026-07-01");
  });

  it("handles a single-day show", () => {
    const shows = parseTica(SAMPLE_HTML);
    const s = shows.find((x) => x.source_id === "9999")!;
    expect(s.start_date).toBe("2026-06-15");
    expect(s.end_date).toBe("2026-06-15");
  });

  it("skips entries without a source id or date", () => {
    const html = `
      <div class="show-list">
        <div class="month-heading">May 2026</div>
        <div class="show-entry">
          <span class="date">01</span>
          <span class="address">Somewhere, Land</span>
        </div>
      </div>`;
    expect(parseTica(html)).toHaveLength(0);
  });
});

describe("parseTicaDetail", () => {
  it("extracts show_format", () => {
    const html = `<label>Show Format</label> <span> Alternative </span>`;
    expect(parseTicaDetail(html).show_format).toBe("Alternative");
  });

  it("returns null show_format when absent", () => {
    expect(parseTicaDetail("<html></html>").show_format).toBeNull();
  });

  it("extracts flyer_url", () => {
    const html = `<div class="flyer"><a href="https://example.com/flyer">flyer</a></div>`;
    expect(parseTicaDetail(html).flyer_url).toBe("https://example.com/flyer");
  });

  it("returns null flyer_url for bare http:// sentinel", () => {
    const html = `<div class="flyer"><a href="http://">flyer</a></div>`;
    expect(parseTicaDetail(html).flyer_url).toBeNull();
  });

  it("returns null flyer_url when absent", () => {
    expect(parseTicaDetail("<html></html>").flyer_url).toBeNull();
  });
});

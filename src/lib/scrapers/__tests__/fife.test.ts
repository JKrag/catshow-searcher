import { describe, it, expect } from "vitest";
import { parseICal, parseFifeDetail, normaliseFifeEvent } from "../fife";

const SAMPLE_ICAL = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:10001208-123@fifeweb.org
SUMMARY:International show
DTSTART;VALUE=DATE:20260509
DTEND;VALUE=DATE:20260510
URL:https://fifeweb.org/event/international-show-1238/
LOCATION:Birkerød 3460\\, Birkerød\\, 3460\\, Denmark
ORGANIZER;CN="Racekatten":MAILTO:foo@bar.dk
END:VEVENT
BEGIN:VEVENT
UID:10001209-456@fifeweb.org
SUMMARY:International show
DTSTART;VALUE=DATE:20260605
DTEND;VALUE=DATE:20260608
URL:https://fifeweb.org/event/international-show-999/
LOCATION:Berlin 10115\\, Berlin\\, 10115\\, Germany
END:VEVENT
END:VCALENDAR`;

describe("parseICal", () => {
  it("parses basic VEVENT fields", () => {
    const events = parseICal(SAMPLE_ICAL);
    const e = events.find((x) => x.uid?.includes("10001208"))!;
    expect(e.summary).toBe("International show");
    expect(e.dtstart).toBe("20260509");
    expect(e.dtend).toBe("20260510");
    expect(e.url).toBe("https://fifeweb.org/event/international-show-1238/");
    expect(e.location).toBe("Birkerød 3460, Birkerød, 3460, Denmark");
    expect(e.organizer).toBe("Racekatten");
  });

  it("parses multiple events", () => {
    expect(parseICal(SAMPLE_ICAL)).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(parseICal("")).toHaveLength(0);
  });

  it("handles missing optional fields gracefully", () => {
    const events = parseICal(SAMPLE_ICAL);
    const e = events.find((x) => x.uid?.includes("10001209"))!;
    expect(e.organizer).toBeUndefined();
  });

  it("unfolds RFC5545 line continuations", () => {
    const ical = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:x\nSUMMARY:Long ti\n tle here\nDTSTART;VALUE=DATE:20260101\nEND:VEVENT\nEND:VCALENDAR`;
    const [e] = parseICal(ical);
    expect(e.summary).toBe("Long title here");
  });
});

describe("normaliseFifeEvent", () => {
  const BASE = {
    uid: "10001208-123@fifeweb.org",
    summary: "International show",
    dtstart: "20260509",
    dtend: "20260511",
    url: "https://fifeweb.org/event/international-show-1/",
    location: "Venue 1234, Copenhagen, 1234, Denmark",
    organizer: "Cat Club DK",
  };

  it("returns null when uid is missing", () => {
    expect(normaliseFifeEvent({ ...BASE, uid: undefined })).toBeNull();
  });

  it("returns null when dtstart is missing", () => {
    expect(normaliseFifeEvent({ ...BASE, dtstart: undefined })).toBeNull();
  });

  it("returns null when summary is missing", () => {
    expect(normaliseFifeEvent({ ...BASE, summary: undefined })).toBeNull();
  });

  it("maps required fields correctly", () => {
    const show = normaliseFifeEvent(BASE)!;
    expect(show.source).toBe("FIFe");
    expect(show.source_id).toBe(BASE.uid);
    expect(show.title).toBe("International show");
    expect(show.start_date).toBe("2026-05-09");
    expect(show.club).toBe("Cat Club DK");
    expect(show.url).toBe(BASE.url);
    expect(show.show_type).toBeNull();
  });

  it("subtracts one day from exclusive DTEND", () => {
    // DTEND 20260511 → inclusive end_date 2026-05-10
    const show = normaliseFifeEvent(BASE)!;
    expect(show.end_date).toBe("2026-05-10");
  });

  it("uses start_date as end_date when DTEND equals DTSTART", () => {
    const show = normaliseFifeEvent({ ...BASE, dtend: BASE.dtstart })!;
    expect(show.end_date).toBe("2026-05-09");
  });

  it("handles missing DTEND by using start_date", () => {
    const show = normaliseFifeEvent({ ...BASE, dtend: undefined })!;
    expect(show.end_date).toBe("2026-05-09");
  });

  it("parses country and city from location", () => {
    const show = normaliseFifeEvent(BASE)!;
    expect(show.country).toBe("Denmark");
    expect(show.city).toBe("Copenhagen");
    expect(show.venue).toBe(BASE.location);
  });

  it("sets country/city/venue to null when location is absent", () => {
    const show = normaliseFifeEvent({ ...BASE, location: undefined })!;
    expect(show.country).toBeNull();
    expect(show.city).toBeNull();
    expect(show.venue).toBeNull();
  });

  it("sets club to null when organizer is absent", () => {
    const show = normaliseFifeEvent({ ...BASE, organizer: undefined })!;
    expect(show.club).toBeNull();
  });
});

describe("parseFifeDetail", () => {
  const SAMPLE_PAGE = `
    <div class="tribe-events-meta-group">
      <dt> Show type </dt>
      <dd class="tribe-meta-value">
        Two 1 day, 2 cert.
      </dd>
    </div>
    <script type="application/ld+json">
      {"@graph":[{"organizer":{"url":"http://www.example-club.dk"}}]}
    </script>`;

  it("extracts show_type", () => {
    expect(parseFifeDetail(SAMPLE_PAGE).show_type).toBe("Two 1 day, 2 cert.");
  });

  it("extracts website_url from organizer JSON-LD", () => {
    expect(parseFifeDetail(SAMPLE_PAGE).website_url).toBe("http://www.example-club.dk");
  });

  it("returns null show_type when absent", () => {
    expect(parseFifeDetail("<html></html>").show_type).toBeNull();
  });

  it("returns null website_url when absent", () => {
    expect(parseFifeDetail("<html></html>").website_url).toBeNull();
  });

  it("filters out fifeweb.org as website_url", () => {
    const html = `{"organizer":{"url":"https://fifeweb.org/organizer/123"}}`;
    expect(parseFifeDetail(html).website_url).toBeNull();
  });

  it("filters out empty website_url", () => {
    const html = `{"organizer":{"url":""}}`;
    expect(parseFifeDetail(html).website_url).toBeNull();
  });
});

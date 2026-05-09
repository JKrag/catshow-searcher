import { describe, it, expect } from "vitest";
import { parseICal, parseFifeDetail } from "../fife";

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

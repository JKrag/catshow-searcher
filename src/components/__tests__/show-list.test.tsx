import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowList } from "../ShowList";
import type { ShowWithDistance, TicaShow } from "@/lib/types";

function ticaShow(overrides: Partial<TicaShow> = {}): ShowWithDistance {
  return {
    id: 1,
    source: "TICA",
    source_id: "1234",
    title: "Test Cat Club",
    club: "Test Cat Club",
    country: "Denmark",
    city: "Copenhagen",
    venue: null,
    start_date: "2026-08-01",
    end_date: "2026-08-02",
    lat: null,
    lng: null,
    url: null,
    scraped_at: "2026-07-08T00:00:00.000Z",
    show_format: null,
    flyer_url: null,
    judges: null,
    detail_fetched: true,
    ...overrides,
  } as ShowWithDistance;
}

describe("ShowList judges sub-row", () => {
  it("renders judges as chips in a full-width sub-row (full variant)", () => {
    const html = renderToStaticMarkup(
      <ShowList
        shows={[ticaShow({ judges: ["Yukimasa Hattori(AB)", "Ana Ferreyra(SP)"] })]}
        homeSet={false}
        variant="full"
      />,
    );
    expect(html).toMatch(/colspan="5"/i);
    expect(html).toContain("Yukimasa Hattori");
    expect(html).toContain(">AB<");
    expect(html).toContain("Ana Ferreyra");
    expect(html).toContain(">SP<");
    // Ring code is split out of the name — the raw "Name(AB)" form is gone
    expect(html).not.toContain("Yukimasa Hattori(AB)");
  });

  it("spans the distance column too when home is set", () => {
    const html = renderToStaticMarkup(
      <ShowList
        shows={[ticaShow({ judges: ["Judge One(AB)"] })]}
        homeSet={true}
        variant="full"
      />,
    );
    expect(html).toMatch(/colspan="6"/i);
  });

  it("renders a judge without a ring suffix as a plain chip", () => {
    const html = renderToStaticMarkup(
      <ShowList shows={[ticaShow({ judges: ["Plain Name"] })]} homeSet={false} variant="full" />,
    );
    expect(html).toContain("Plain Name");
  });

  it("renders no sub-row when there are no judges", () => {
    const html = renderToStaticMarkup(
      <ShowList shows={[ticaShow({ judges: null })]} homeSet={false} variant="full" />,
    );
    expect(html).not.toMatch(/colspan/i);
    expect(html).not.toContain("Judges");
  });

  it("hides judges in the visitor variant", () => {
    const html = renderToStaticMarkup(
      <ShowList
        shows={[ticaShow({ judges: ["Yukimasa Hattori(AB)"] })]}
        homeSet={false}
        variant="visitor"
      />,
    );
    expect(html).not.toContain("Hattori");
  });
});

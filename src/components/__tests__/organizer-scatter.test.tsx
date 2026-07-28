import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OrganizerScatter } from "../OrganizerScatter";
import type { Candidate, WeekendAssessment, AssessedShow } from "@/lib/organizer";
import type { FifeShow, TicaShow } from "@/lib/types";

function fifeShow(overrides: Partial<FifeShow> = {}): FifeShow {
  return {
    id: 1,
    source: "FIFe",
    source_id: "f1",
    title: "Test FIFe Show",
    club: "Test Club",
    country: "Denmark",
    city: "Copenhagen",
    venue: null,
    start_date: "2027-09-18",
    end_date: "2027-09-18",
    lat: 55.5,
    lng: 12.5,
    geo_precision: "venue",
    url: null,
    scraped_at: "2027-01-01T00:00:00.000Z",
    show_type: null,
    website_url: null,
    detail_fetched: true,
    ...overrides,
  };
}

function ticaShow(overrides: Partial<TicaShow> = {}): TicaShow {
  return {
    id: 2,
    source: "TICA",
    source_id: "t1",
    title: "Test TICA Show",
    club: "Test Club",
    country: "Denmark",
    city: "Odense",
    venue: null,
    start_date: "2027-09-18",
    end_date: "2027-09-18",
    lat: 55.4,
    lng: 12.4,
    geo_precision: "venue",
    url: null,
    scraped_at: "2027-01-01T00:00:00.000Z",
    show_format: null,
    flyer_url: null,
    judges: null,
    detail_fetched: true,
    ...overrides,
  };
}

function assessedShow(overrides: Partial<AssessedShow> = {}): AssessedShow {
  return {
    show: fifeShow(),
    status: "competition",
    weekend: "2027-09-18",
    distance_km: 120,
    ...overrides,
  };
}

function weekendAssessment(overrides: Partial<WeekendAssessment> = {}): WeekendAssessment {
  return {
    weekend: "2027-09-18",
    status: "clear",
    shows: [assessedShow()],
    beyondCapCount: 0,
    noLocationCount: 0,
    ...overrides,
  };
}

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  lat: 55.6761,
  lng: 12.5683,
  from: "2027-09-01",
  to: "2027-10-15",
  org: "FIFe",
  ...overrides,
});

describe("OrganizerScatter", () => {
  it("renders empty state when there are no assessments (empty/invalid window)", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[]}
        candidate={candidate()}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).toContain("Pick a date window to see conflicts");
  });

  it("renders one dot per show and a column per weekend", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[weekendAssessment(), weekendAssessment({ weekend: "2027-09-25" })]}
        candidate={candidate()}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect((html.match(/<circle/g) ?? []).length).toBe(2);
    expect(html).toContain("Sep 18");
    expect(html).toContain("Sep 25");
  });

  it("draws the FIFe rule line but not the TICA one when candidate.org is FIFe", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[weekendAssessment()]}
        candidate={candidate({ org: "FIFe" })}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).toContain('data-testid="rule-line-fife"');
    expect(html).not.toContain('data-testid="rule-line-tica"');
  });

  it("draws the TICA rule line but not the FIFe one when candidate.org is TICA", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[weekendAssessment()]}
        candidate={candidate({ org: "TICA" })}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).toContain('data-testid="rule-line-tica"');
    expect(html).not.toContain('data-testid="rule-line-fife"');
  });

  it("draws no rule line when candidate.org is 'other'", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[weekendAssessment()]}
        candidate={candidate({ org: "other" })}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).not.toContain('data-testid="rule-line-fife"');
    expect(html).not.toContain('data-testid="rule-line-tica"');
  });

  it("renders hollow dots (white fill) for non-venue precision shows", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[
          weekendAssessment({
            shows: [assessedShow({ show: fifeShow({ geo_precision: "city" }) })],
          }),
        ]}
        candidate={candidate()}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).toContain('fill="white"');
  });

  it("shows the +N overflow label when beyondCapCount is set", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[weekendAssessment({ beyondCapCount: 3 })]}
        candidate={candidate()}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).toContain("+3 further away");
  });

  it("marks the selected weekend column with aria-pressed=true", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[weekendAssessment(), weekendAssessment({ weekend: "2027-09-25" })]}
        candidate={candidate()}
        selectedWeekend="2027-09-25"
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).toMatch(/aria-pressed="true"/);
    expect(html).toMatch(/aria-pressed="false"/);
  });

  it("renders both FIFe (purple) and TICA (orange) marker colors when both are present", () => {
    const html = renderToStaticMarkup(
      <OrganizerScatter
        assessments={[
          weekendAssessment({
            shows: [
              assessedShow({ show: fifeShow(), status: "clear" }),
              assessedShow({ show: ticaShow({ id: 3 }), status: "competition" }),
            ],
          }),
        ]}
        candidate={candidate()}
        selectedWeekend={null}
        onSelectWeekend={() => {}}
      />,
    );
    expect(html).toContain("#7c3aed");
    expect(html).toContain("#ea580c");
  });
});

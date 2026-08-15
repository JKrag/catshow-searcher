// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function titleColumn(row: HTMLElement): string {
  const cells = row.querySelectorAll("td");
  // Org, Dates, Title/Club, ...
  return cells[2]?.textContent ?? "";
}

describe("ShowList sortable columns", () => {
  const shows = [
    ticaShow({ id: 1, title: "Zebra Show", start_date: "2026-09-01", end_date: "2026-09-02" }),
    ticaShow({ id: 2, title: "Alpha Show", start_date: "2026-07-01", end_date: "2026-07-02" }),
    ticaShow({ id: 3, title: "Mid Show", start_date: "2026-08-01", end_date: "2026-08-02" }),
  ];

  function rows() {
    return screen.getAllByRole("row").slice(1); // drop header row
  }

  it("defaults to date-ascending sort", () => {
    render(<ShowList shows={shows} homeSet={false} />);
    const order = rows().map(titleColumn);
    expect(order).toEqual(["Alpha ShowTest Cat Club", "Mid ShowTest Cat Club", "Zebra ShowTest Cat Club"]);
  });

  it("toggles date sort to descending on a second click", async () => {
    const user = userEvent.setup();
    render(<ShowList shows={shows} homeSet={false} />);

    await user.click(screen.getByText("Dates"));

    const order = rows().map(titleColumn);
    expect(order).toEqual(["Zebra ShowTest Cat Club", "Mid ShowTest Cat Club", "Alpha ShowTest Cat Club"]);
  });

  it("sorts by title when the Title/Club header is clicked", async () => {
    const user = userEvent.setup();
    render(<ShowList shows={shows} homeSet={false} />);

    await user.click(screen.getByText("Title / Club"));

    const order = rows().map(titleColumn);
    expect(order).toEqual(["Alpha ShowTest Cat Club", "Mid ShowTest Cat Club", "Zebra ShowTest Cat Club"]);
  });

  it("respects an explicit initialSort prop", () => {
    render(
      <ShowList
        shows={shows}
        homeSet={false}
        initialSort={{ column: "title", direction: "desc" }}
      />,
    );
    const order = rows().map(titleColumn);
    expect(order).toEqual(["Zebra ShowTest Cat Club", "Mid ShowTest Cat Club", "Alpha ShowTest Cat Club"]);
  });
});

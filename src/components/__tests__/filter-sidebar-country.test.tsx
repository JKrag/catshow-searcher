// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSidebar, defaultFilters, loadPersistedFilters, savePersistedFilters } from "../FilterSidebar";
import type { Filters } from "../FilterSidebar";

const COUNTRIES = ["Denmark", "Germany", "Sweden"];

function makeFilters(overrides: Partial<Filters> = {}): Filters {
  return { ...defaultFilters, ...overrides };
}

function Harness({ initial }: { initial: Filters }) {
  const [filters, setFilters] = useState(initial);
  return (
    <FilterSidebar
      filters={filters}
      onChange={setFilters}
      countries={COUNTRIES}
      homeSet={false}
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("FilterSidebar country selector persistence", () => {
  it("persists a toggled country to localStorage", async () => {
    const user = userEvent.setup();
    render(<Harness initial={makeFilters()} />);

    await user.click(screen.getByRole("checkbox", { name: "Germany" }));

    expect(loadPersistedFilters("full").countries).toEqual(["Germany"]);
  });

  it("loads persisted countries from localStorage on mount and reports them via onChange", async () => {
    savePersistedFilters({ ...defaultFilters, countries: ["Sweden"] }, "full");

    let latest: Filters | null = null;
    render(
      <FilterSidebar
        filters={makeFilters()}
        onChange={(f) => {
          latest = f;
        }}
        countries={COUNTRIES}
        homeSet={false}
      />,
    );

    await screen.findByRole("checkbox", { name: "Sweden" });
    expect(latest).not.toBeNull();
    expect(latest!.countries).toEqual(["Sweden"]);
  });

  it("pins selected countries to the top of the checkbox list", () => {
    render(
      <FilterSidebar
        filters={makeFilters({ countries: ["Sweden"] })}
        onChange={() => {}}
        countries={COUNTRIES}
        homeSet={false}
      />,
    );

    const labels = screen.getAllByRole("checkbox").map((el) => el.closest("label")?.textContent ?? "");
    const swedenIndex = labels.findIndex((t) => t.includes("Sweden"));
    const denmarkIndex = labels.findIndex((t) => t.includes("Denmark"));
    expect(swedenIndex).toBeLessThan(denmarkIndex);
  });

  it("removes a country from localStorage when unchecked", async () => {
    savePersistedFilters({ ...defaultFilters, countries: ["Germany"] }, "full");
    const user = userEvent.setup();
    render(<Harness initial={makeFilters({ countries: ["Germany"] })} />);

    await user.click(screen.getByRole("checkbox", { name: "Germany" }));

    expect(loadPersistedFilters("full").countries).toEqual([]);
  });
});

describe("FilterSidebar full-filters persistence", () => {
  it("persists non-country filter fields (org, dates, search) across remount", async () => {
    const user = userEvent.setup();
    const first = render(<Harness initial={makeFilters()} />);

    await user.click(screen.getByRole("button", { name: "TICA" }));
    await user.type(screen.getByPlaceholderText("Title, club, city, venue…"), "cattery");

    const persisted = loadPersistedFilters("full");
    expect(persisted.org).not.toContain("TICA");
    expect(persisted.q).toBe("cattery");

    first.unmount();

    render(<Harness initial={makeFilters()} />);
    const ticaButton = await screen.findByRole("button", { name: "TICA" });
    expect(ticaButton).toHaveAttribute("aria-pressed", "false");
  });

  it("Reset filters button restores defaults and clears persisted overrides", async () => {
    const user = userEvent.setup();
    render(<Harness initial={makeFilters({ countries: ["Sweden"], q: "x" })} />);

    await user.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(screen.getByPlaceholderText("Title, club, city, venue…")).toHaveValue("");
    expect(screen.queryByText(/^Clear \(/)).toBeNull();
    expect(loadPersistedFilters("full").countries).toEqual([]);
  });
});

// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSidebar, defaultFilters, loadPersistedCountries, savePersistedCountries } from "../FilterSidebar";
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

    expect(loadPersistedCountries()).toEqual(["Germany"]);
  });

  it("loads persisted countries from localStorage on mount and reports them via onChange", async () => {
    savePersistedCountries(["Sweden"]);

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
    savePersistedCountries(["Germany"]);
    const user = userEvent.setup();
    render(<Harness initial={makeFilters({ countries: ["Germany"] })} />);

    await user.click(screen.getByRole("checkbox", { name: "Germany" }));

    expect(loadPersistedCountries()).toEqual([]);
  });
});

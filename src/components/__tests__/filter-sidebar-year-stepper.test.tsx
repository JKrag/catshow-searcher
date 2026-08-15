// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { FilterSidebar, defaultFilters } from "../FilterSidebar";

describe("FilterSidebar — year stepper buttons", () => {
  it("renders both From and To date inputs with labels", () => {
    render(<FilterSidebar filters={defaultFilters} onChange={vi.fn()} countries={[]} homeSet={false} />);
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
  });

  it("increments 'From' date by one year (keeps month/day, clamps Feb 29 → Feb 28)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, from: "2028-02-29" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const fromLabel = screen.getByText("From");
    const fromContainer = fromLabel.closest("label");
    const plusButton = fromContainer.querySelector('[data-testid="year-stepper-plus"]');
    expect(plusButton).toBeTruthy();

    await user.click(plusButton);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2029-02-28",
      }),
    );
  });

  it("decrements 'From' date by one year (keeps month/day, clamps Feb 29 → Feb 28)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, from: "2028-02-28" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const fromLabel = screen.getByText("From");
    const fromContainer = fromLabel.closest("label");
    const minusButton = fromContainer.querySelector('[data-testid="year-stepper-minus"]');
    expect(minusButton).toBeTruthy();

    await user.click(minusButton);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2027-02-28",
      }),
    );
  });

  it("increments 'From' date by one year for non-Feb 29 dates", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, from: "2026-06-15" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const fromLabel = screen.getByText("From");
    const fromContainer = fromLabel.closest("label");
    const plusButton = fromContainer.querySelector('[data-testid="year-stepper-plus"]');
    expect(plusButton).toBeTruthy();

    await user.click(plusButton);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2027-06-15",
      }),
    );
  });

  it("decrements 'From' date by one year for non-Feb 29 dates", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, from: "2027-06-15" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const fromLabel = screen.getByText("From");
    const fromContainer = fromLabel.closest("label");
    const minusButton = fromContainer.querySelector('[data-testid="year-stepper-minus"]');
    expect(minusButton).toBeTruthy();

    await user.click(minusButton);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2026-06-15",
      }),
    );
  });

  it("increments 'To' date by one year (keeps month/day, clamps Feb 29 → Feb 28)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, to: "2028-02-29" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const toLabel = screen.getByText("To");
    const toContainer = toLabel.closest("label");
    const plusButton = toContainer.querySelector('[data-testid="year-stepper-plus"]');
    expect(plusButton).toBeTruthy();

    await user.click(plusButton);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "2029-02-28",
      }),
    );
  });

  it("decrements 'To' date by one year (keeps month/day, clamps Feb 29 → Feb 28)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, to: "2028-02-28" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const toLabel = screen.getByText("To");
    const toContainer = toLabel.closest("label");
    const minusButton = toContainer.querySelector('[data-testid="year-stepper-minus"]');
    expect(minusButton).toBeTruthy();

    await user.click(minusButton);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "2027-02-28",
      }),
    );
  });

  it("applies the native date picker selection after clicking year stepper", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, from: "2026-03-15" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const fromLabel = screen.getByText("From");
    const fromContainer = fromLabel.closest("label");

    // Now click the +1yr button on the From field
    const plusButton = fromContainer.querySelector('[data-testid="year-stepper-plus"]');
    expect(plusButton).toBeTruthy();
    await user.click(plusButton);
    // The onChange callback should be called with the incremented date
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2027-03-15",
      }),
    );
  });

  it("increments 'To' date by one year for non-Feb 29 dates", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterSidebar filters={{ ...defaultFilters, to: "2026-09-10" }} onChange={onChange} countries={[]} homeSet={false} />,
    );

    const toLabel = screen.getByText("To");
    const toContainer = toLabel.closest("label");
    const plusButton = toContainer.querySelector('[data-testid="year-stepper-plus"]');
    expect(plusButton).toBeTruthy();

    await user.click(plusButton);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "2027-09-10",
      }),
    );
  });
});

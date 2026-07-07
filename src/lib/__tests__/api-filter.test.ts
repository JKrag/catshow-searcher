import { describe, it, expect } from "vitest";
import { resolveFromFilter } from "../api-filter";

function sp(params: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams(params);
}

describe("resolveFromFilter", () => {
  const TODAY = "2026-07-07";

  it("defaults to today when no params are given", () => {
    expect(resolveFromFilter(sp(), TODAY)).toBe("2026-07-07");
  });

  it("returns undefined when include_past=1 (show all shows)", () => {
    expect(resolveFromFilter(sp({ include_past: "1" }), TODAY)).toBeUndefined();
  });

  it("uses the explicit from param when provided", () => {
    expect(resolveFromFilter(sp({ from: "2025-01-01" }), TODAY)).toBe("2025-01-01");
  });

  it("explicit from wins even when include_past=1 is also set", () => {
    expect(resolveFromFilter(sp({ from: "2025-06-15", include_past: "1" }), TODAY)).toBe(
      "2025-06-15",
    );
  });
});

import { describe, it, expect } from "vitest";
import { normalizeCountry } from "../normalize-country";

describe("normalizeCountry", () => {
  it("returns null for null input", () => {
    expect(normalizeCountry(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeCountry(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeCountry("")).toBeNull();
    expect(normalizeCountry("   ")).toBeNull();
  });

  it("passes through already-canonical English names unchanged", () => {
    expect(normalizeCountry("Denmark")).toBe("Denmark");
    expect(normalizeCountry("United Kingdom")).toBe("United Kingdom");
    expect(normalizeCountry("United States")).toBe("United States");
  });

  it("maps common non-English names", () => {
    expect(normalizeCountry("Danmark")).toBe("Denmark");
    expect(normalizeCountry("Norge")).toBe("Norway");
    expect(normalizeCountry("Sverige")).toBe("Sweden");
    expect(normalizeCountry("Suomi")).toBe("Finland");
    expect(normalizeCountry("Deutschland")).toBe("Germany");
    expect(normalizeCountry("Nederland")).toBe("Netherlands");
    expect(normalizeCountry("Italia")).toBe("Italy");
    expect(normalizeCountry("Polska")).toBe("Poland");
    expect(normalizeCountry("Hrvatska")).toBe("Croatia");
  });

  it("is case-insensitive", () => {
    expect(normalizeCountry("DANMARK")).toBe("Denmark");
    expect(normalizeCountry("deutschland")).toBe("Germany");
    expect(normalizeCountry("Österreich")).toBe("Austria");
  });

  it("strips TICA Regional suffix", () => {
    expect(normalizeCountry("Denmark Regional")).toBe("Denmark");
    expect(normalizeCountry("Germany Region")).toBe("Germany");
    expect(normalizeCountry("Norway Annual")).toBe("Norway");
  });

  it("strips suffix before alias lookup", () => {
    expect(normalizeCountry("Danmark Regional")).toBe("Denmark");
  });

  it("maps UK variants to United Kingdom", () => {
    expect(normalizeCountry("England")).toBe("United Kingdom");
    expect(normalizeCountry("Scotland")).toBe("United Kingdom");
    expect(normalizeCountry("Wales")).toBe("United Kingdom");
    expect(normalizeCountry("Great Britain")).toBe("United Kingdom");
  });

  it("maps Japanese kanji", () => {
    expect(normalizeCountry("日本")).toBe("Japan");
  });

  it("passes through unknown strings unchanged", () => {
    expect(normalizeCountry("Narnia")).toBe("Narnia");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeCountry("  Denmark  ")).toBe("Denmark");
    expect(normalizeCountry("  Danmark  ")).toBe("Denmark");
  });
});

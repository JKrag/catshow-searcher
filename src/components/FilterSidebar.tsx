"use client";

import { useState } from "react";
import type { Org } from "@/lib/types";

export interface Filters {
  org: Org[];
  countries: string[];
  from: string;
  to: string;
  q: string;
  maxDistanceKm: number | null;
}

export const defaultFilters: Filters = {
  org: ["FIFe", "TICA"],
  countries: [],
  from: "",
  to: "",
  q: "",
  maxDistanceKm: null,
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  countries: string[];
  homeSet: boolean;
}

export function FilterSidebar({ filters, onChange, countries, homeSet }: Props) {
  const [countryQuery, setCountryQuery] = useState("");

  const toggleOrg = (o: Org) => {
    const has = filters.org.includes(o);
    onChange({
      ...filters,
      org: has ? filters.org.filter((x) => x !== o) : [...filters.org, o],
    });
  };

  const toggleCountry = (c: string) => {
    const has = filters.countries.includes(c);
    onChange({
      ...filters,
      countries: has ? filters.countries.filter((x) => x !== c) : [...filters.countries, c],
    });
  };

  const visibleCountries = countries.filter((c) =>
    c.toLowerCase().includes(countryQuery.toLowerCase()),
  );

  return (
    <aside className="w-full lg:w-72 lg:sticky lg:top-4 lg:self-start space-y-5 text-sm">
      <section>
        <h3 className="font-semibold mb-2">Organisation</h3>
        <div className="flex gap-2">
          {(["FIFe", "TICA"] as Org[]).map((o) => {
            const active = filters.org.includes(o);
            const base =
              "px-3 py-1 rounded-full ring-1 ring-inset cursor-pointer text-xs font-semibold transition";
            const colors =
              o === "FIFe"
                ? active
                  ? "bg-blue-600 text-white ring-blue-700"
                  : "bg-blue-50 text-blue-900 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900"
                : active
                  ? "bg-rose-600 text-white ring-rose-700"
                  : "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900";
            return (
              <button
                key={o}
                type="button"
                onClick={() => toggleOrg(o)}
                className={`${base} ${colors}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Search</h3>
        <input
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Title, club, city, venue…"
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
        />
      </section>

      <section>
        <h3 className="font-semibold mb-2">Date range</h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-2">
            <span className="text-zinc-500">From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-zinc-500">To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Country</h3>
        <input
          type="search"
          value={countryQuery}
          onChange={(e) => setCountryQuery(e.target.value)}
          placeholder="Filter countries…"
          className="mb-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
        />
        <div className="max-h-44 overflow-y-auto pr-1 space-y-0.5 border border-zinc-200 dark:border-zinc-800 rounded p-1">
          {visibleCountries.length === 0 && (
            <div className="text-zinc-500 px-1">No matches</div>
          )}
          {visibleCountries.map((c) => (
            <label key={c} className="flex items-center gap-2 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.countries.includes(c)}
                onChange={() => toggleCountry(c)}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Max driving distance</h3>
        {!homeSet && (
          <p className="text-zinc-500 mb-1">Set a home address to use this.</p>
        )}
        <select
          disabled={!homeSet}
          value={filters.maxDistanceKm ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              maxDistanceKm: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 disabled:opacity-50"
        >
          <option value="">Any distance</option>
          <option value="100">≤ 100 km</option>
          <option value="250">≤ 250 km</option>
          <option value="500">≤ 500 km</option>
          <option value="1000">≤ 1000 km</option>
          <option value="2000">≤ 2000 km</option>
        </select>
      </section>
    </aside>
  );
}

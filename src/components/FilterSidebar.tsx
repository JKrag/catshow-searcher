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
    <aside className="w-full lg:w-72 lg:sticky lg:top-20 lg:self-start text-sm">
      <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/60 backdrop-blur ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-sm divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
        <section className="p-4">
          <h3 className="font-semibold mb-2.5 text-xs uppercase tracking-wider text-zinc-500">
            Organisation
          </h3>
          <div className="flex gap-2">
            {(["FIFe", "TICA"] as Org[]).map((o) => {
              const active = filters.org.includes(o);
              const base =
                "flex-1 px-3 py-1.5 rounded-lg ring-1 ring-inset cursor-pointer text-xs font-semibold transition active:scale-[0.98]";
              const colors =
                o === "FIFe"
                  ? active
                    ? "bg-blue-600 text-white ring-blue-700 shadow-sm shadow-blue-600/20"
                    : "bg-blue-50 text-blue-900 ring-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900 dark:hover:bg-blue-950"
                  : active
                    ? "bg-rose-600 text-white ring-rose-700 shadow-sm shadow-rose-600/20"
                    : "bg-rose-50 text-rose-900 ring-rose-200 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900 dark:hover:bg-rose-950";
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggleOrg(o)}
                  aria-pressed={active}
                  className={`${base} ${colors}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </section>

        <section className="p-4">
          <h3 className="font-semibold mb-2.5 text-xs uppercase tracking-wider text-zinc-500">
            Search
          </h3>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
              ⌕
            </span>
            <input
              type="search"
              value={filters.q}
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
              placeholder="Title, club, city, venue…"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-7 pr-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition"
            />
          </div>
        </section>

        <section className="p-4">
          <h3 className="font-semibold mb-2.5 text-xs uppercase tracking-wider text-zinc-500">
            Date range
          </h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-2">
              <span className="text-zinc-500">From</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => onChange({ ...filters, from: e.target.value })}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-zinc-500">To</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => onChange({ ...filters, to: e.target.value })}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition"
              />
            </label>
          </div>
        </section>

        <section className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-500">
              Country
            </h3>
            {filters.countries.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, countries: [] })}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear ({filters.countries.length})
              </button>
            )}
          </div>
          <input
            type="search"
            value={countryQuery}
            onChange={(e) => setCountryQuery(e.target.value)}
            placeholder="Filter countries…"
            className="mb-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition"
          />
          <div className="thin-scroll max-h-44 overflow-y-auto pr-1 space-y-px rounded-lg bg-zinc-50/60 dark:bg-zinc-950/40 ring-1 ring-zinc-200 dark:ring-zinc-800 p-1">
            {visibleCountries.length === 0 && (
              <div className="text-zinc-500 px-2 py-1">No matches</div>
            )}
            {visibleCountries.map((c) => {
              const checked = filters.countries.includes(c);
              return (
                <label
                  key={c}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition ${
                    checked
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100"
                      : "hover:bg-white dark:hover:bg-zinc-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCountry(c)}
                    className="accent-indigo-600"
                  />
                  <span className="truncate">{c}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-500">
              Max driving distance
            </h3>
            {homeSet && filters.maxDistanceKm != null && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, maxDistanceKm: null })}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {!homeSet ? (
            <p className="text-zinc-500 mb-1.5 text-xs">
              Set a home address to use this.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {filters.maxDistanceKm
                    ? `≤ ${filters.maxDistanceKm.toLocaleString()} km`
                    : "Any distance"}
                </span>
                <span className="text-[11px] text-zinc-500 tabular-nums">
                  50 – 3000 km
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={3000}
                step={50}
                value={filters.maxDistanceKm ?? 3000}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onChange({
                    ...filters,
                    maxDistanceKm: v >= 3000 ? null : v,
                  });
                }}
                aria-label="Maximum driving distance in kilometres"
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1 px-0.5 tabular-nums">
                <span>50</span>
                <span>500</span>
                <span>1000</span>
                <span>2000</span>
                <span>∞</span>
              </div>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}

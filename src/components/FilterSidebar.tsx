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
      <div className="rounded-2xl bg-card/80 backdrop-blur ring-1 ring-border shadow-sm divide-y divide-border overflow-hidden">
        <section className="p-4">
          <h3 className="font-semibold mb-2.5 text-xs uppercase tracking-wider text-muted-foreground">
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
                    ? "bg-[var(--primary)] text-[var(--primary-fg)] ring-[var(--primary)] shadow-sm"
                    : "bg-[var(--fife-soft)] text-[var(--fife-fg)] ring-[var(--fife)]/30 hover:bg-[var(--primary)]/15"
                  : active
                    ? "bg-[var(--secondary)] text-[var(--secondary-fg)] ring-[var(--secondary)] shadow-sm"
                    : "bg-[var(--tica-soft)] text-[var(--tica-fg)] ring-[var(--tica)]/30 hover:bg-[var(--secondary)]/15";
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
          <h3 className="font-semibold mb-2.5 text-xs uppercase tracking-wider text-muted-foreground">
            Search
          </h3>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              ⌕
            </span>
            <input
              type="search"
              value={filters.q}
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
              placeholder="Title, club, city, venue…"
              className="w-full rounded-lg border border-border bg-[var(--surface)] pl-7 pr-2 py-1.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition"
            />
          </div>
        </section>

        <section className="p-4">
          <h3 className="font-semibold mb-2.5 text-xs uppercase tracking-wider text-muted-foreground">
            Date range
          </h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">From</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => onChange({ ...filters, from: e.target.value })}
                className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">To</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => onChange({ ...filters, to: e.target.value })}
                className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition"
              />
            </label>
          </div>
        </section>

        <section className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Country
            </h3>
            {filters.countries.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, countries: [] })}
                className="text-[11px] text-[var(--primary)] hover:underline"
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
            className="mb-2 w-full rounded-lg border border-border bg-[var(--surface)] px-2 py-1.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition"
          />
          <div className="thin-scroll max-h-44 overflow-y-auto pr-1 space-y-px rounded-lg bg-[var(--muted-soft)]/50 ring-1 ring-border p-1">
            {visibleCountries.length === 0 && (
              <div className="text-muted-foreground px-2 py-1">No matches</div>
            )}
            {visibleCountries.map((c) => {
              const checked = filters.countries.includes(c);
              return (
                <label
                  key={c}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition ${
                    checked
                      ? "bg-[var(--primary)]/15 text-foreground"
                      : "hover:bg-[var(--surface)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCountry(c)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="truncate">{c}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Max driving distance
            </h3>
            {homeSet && filters.maxDistanceKm != null && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, maxDistanceKm: null })}
                className="text-[11px] text-[var(--primary)] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {!homeSet ? (
            <p className="text-muted-foreground mb-1.5 text-xs">
              Set a home address to use this.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {filters.maxDistanceKm
                    ? `≤ ${filters.maxDistanceKm.toLocaleString()} km`
                    : "Any distance"}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
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
                className="w-full accent-[var(--primary)] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1 px-0.5 tabular-nums">
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
